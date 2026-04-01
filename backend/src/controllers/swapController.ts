import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { EmployeeModel, ShiftModel, SwapRequestModel, UserModel } from '../models';
import { ok } from '../utils/api';
import { createNotification } from '../utils/notificationFactory';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

async function getCurrentEmployee(req: Request): Promise<{ employeeId: Types.ObjectId; orgId: Types.ObjectId }> {
  if (!req.employee) throw new Error('Unauthorized');
  return { employeeId: new Types.ObjectId(req.employee.id), orgId: new Types.ObjectId(req.employee.organizationId) };
}

export async function listSwaps(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (typeof req.query.status === 'string') filter.status = req.query.status;
    if (typeof req.query.targetStatus === 'string') filter.targetStatus = req.query.targetStatus;

    if (req.employee) {
      const empId = new Types.ObjectId(req.employee.id);
      filter.$or = [{ requesterId: empId }, { targetEmployeeId: empId }];
    }

    const [total, swaps] = await Promise.all([
      SwapRequestModel.countDocuments(filter),
      SwapRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requesterId')
        .populate('targetEmployeeId')
        .populate('requestedShiftId')
        .populate('offeredShiftId')
        .lean(),
    ]);

    res.json(ok(swaps, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function createSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = await getCurrentEmployee(req);
    const payload = req.body as Record<string, unknown>;

    const requestedShiftId = new Types.ObjectId(String(payload.requestedShiftId));
    const targetEmployeeId = new Types.ObjectId(String(payload.targetEmployeeId));
    const offeredShiftId = payload.offeredShiftId ? new Types.ObjectId(String(payload.offeredShiftId)) : undefined;

    if (targetEmployeeId.toString() === employeeId.toString()) {
      res.status(400).json({ success: false, message: 'Cannot target yourself' });
      return;
    }

    const target = await EmployeeModel.findOne({ _id: targetEmployeeId, organizationId: orgId, isActive: true }).lean();
    if (!target) {
      res.status(404).json({ success: false, message: 'Target employee not found' });
      return;
    }

    const requestedShift = await ShiftModel.findOne({ _id: requestedShiftId, organizationId: orgId }).lean();
    if (!requestedShift) {
      res.status(404).json({ success: false, message: 'Requested shift not found' });
      return;
    }
    if (requestedShift.employeeId.toString() !== employeeId.toString()) {
      res.status(403).json({ success: false, message: 'Cannot request swap for this shift' });
      return;
    }
    if (requestedShift.date.getTime() < Date.now()) {
      res.status(400).json({ success: false, message: 'Cannot request swap for past shifts' });
      return;
    }

    if (offeredShiftId) {
      const offeredShift = await ShiftModel.findOne({ _id: offeredShiftId, organizationId: orgId }).lean();
      if (!offeredShift) {
        res.status(404).json({ success: false, message: 'Offered shift not found' });
        return;
      }
      if (offeredShift.employeeId.toString() !== targetEmployeeId.toString()) {
        res.status(400).json({ success: false, message: 'Offered shift must belong to the target employee' });
        return;
      }
      if (offeredShift._id.toString() === requestedShiftId.toString()) {
        res.status(400).json({ success: false, message: 'Cannot swap a shift with itself' });
        return;
      }
      if (offeredShift.date.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'Cannot offer a past shift in a swap' });
        return;
      }
    }

    const swap = await SwapRequestModel.create({
      organizationId: orgId,
      requesterId: employeeId,
      requestedShiftId,
      targetEmployeeId,
      offeredShiftId,
      targetStatus: 'pending',
      status: 'pending',
      requesterNote: payload.requesterNote ? String(payload.requesterNote) : undefined,
    });

    // Notification targeting will be refactored in notifications-scope todo.

    // Notify target employee via their dashboard (they'll see it in incoming swaps).

    res.status(201).json(ok(swap));
  } catch (err) {
    next(err);
  }
}

export async function getSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId })
      .populate('requesterId')
      .populate('targetEmployeeId')
      .populate('requestedShiftId')
      .populate('offeredShiftId')
      .lean();

    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }

    if (req.employee) {
      const isRequester = swap.requesterId?._id?.toString?.() === req.employee.id;
      const isTarget = swap.targetEmployeeId?._id?.toString?.() === req.employee.id;
      if (!isRequester && !isTarget) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
    }

    res.json(ok(swap));
  } catch (err) {
    next(err);
  }
}

export async function approveSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const reviewerId = req.user?.id;
    if (!organizationId || !reviewerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }
    if (swap.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Swap is not pending' });
      return;
    }
    if (swap.targetStatus !== 'accepted') {
      res.status(400).json({ success: false, message: 'Target employee must accept first' });
      return;
    }

    const requestedShift = await ShiftModel.findOne({ _id: swap.requestedShiftId, organizationId: orgId });
    if (!requestedShift) {
      res.status(404).json({ success: false, message: 'Requested shift not found' });
      return;
    }

    const targetEmployeeId = swap.targetEmployeeId as Types.ObjectId;

    if (swap.offeredShiftId) {
      const offeredShift = await ShiftModel.findOne({ _id: swap.offeredShiftId, organizationId: orgId });
      if (!offeredShift) {
        res.status(404).json({ success: false, message: 'Offered shift not found' });
        return;
      }

      const requesterEmployeeId = swap.requesterId as Types.ObjectId;

      requestedShift.employeeId = targetEmployeeId;
      offeredShift.employeeId = requesterEmployeeId;
      await requestedShift.save();
      await offeredShift.save();
    } else {
      requestedShift.employeeId = targetEmployeeId;
      await requestedShift.save();
    }

    swap.status = 'approved';
    swap.managerNote = req.body.managerNote ? String(req.body.managerNote) : undefined;
    swap.reviewedBy = new Types.ObjectId(reviewerId);
    swap.reviewedAt = new Date();
    await swap.save();

    res.json(ok(swap.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function rejectSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const reviewerId = req.user?.id;
    if (!organizationId || !reviewerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }
    if (swap.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Swap is not pending' });
      return;
    }

    swap.status = 'rejected';
    swap.managerNote = req.body.managerNote ? String(req.body.managerNote) : undefined;
    swap.reviewedBy = new Types.ObjectId(reviewerId);
    swap.reviewedAt = new Date();
    await swap.save();

    // Notification targeting will be refactored in notifications-scope todo.

    res.json(ok(swap.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function cancelSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = await getCurrentEmployee(req);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }
    if (swap.requesterId.toString() !== employeeId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (swap.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Only pending swaps can be cancelled' });
      return;
    }

    swap.status = 'cancelled';
    await swap.save();

    res.json(ok(swap.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function acceptSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = await getCurrentEmployee(req);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }
    if (swap.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Swap is not pending' });
      return;
    }
    if (swap.targetEmployeeId.toString() !== employeeId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    swap.targetStatus = 'accepted';
    swap.targetRespondedAt = new Date();
    await swap.save();

    const managers = await UserModel.find({ organizationId: orgId, role: { $in: ['owner', 'manager'] }, isActive: true })
      .select('_id')
      .lean();
    for (const m of managers) {
      await createNotification({
        organizationId: orgId,
        userId: m._id,
        type: 'swap_request',
        title: 'Swap accepted (manager approval needed)',
        message: 'A swap request was accepted by the target employee and is ready for approval.',
        relatedEntity: { entityType: 'swap', entityId: swap._id },
      });
    }

    res.json(ok(swap.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function declineSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = await getCurrentEmployee(req);

    const swap = await SwapRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!swap) {
      res.status(404).json({ success: false, message: 'Swap not found' });
      return;
    }
    if (swap.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Swap is not pending' });
      return;
    }
    if (swap.targetEmployeeId.toString() !== employeeId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    swap.targetStatus = 'declined';
    swap.targetRespondedAt = new Date();
    await swap.save();

    res.json(ok(swap.toJSON()));
  } catch (err) {
    next(err);
  }
}

