import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { TimeOffRequestModel, UserModel } from '../models';
import { ok } from '../utils/api';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { createNotification } from '../utils/notificationFactory';

function requireEmployeeAuth(req: Request): { employeeId: Types.ObjectId; orgId: Types.ObjectId } {
  if (!req.employee) throw new Error('Unauthorized');
  return { employeeId: new Types.ObjectId(req.employee.id), orgId: new Types.ObjectId(req.employee.organizationId) };
}

export async function listTimeOff(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    if (typeof req.query.type === 'string') filter.type = req.query.type;
    if (req.employee) filter.employeeId = new Types.ObjectId(req.employee.id);

    const [total, items] = await Promise.all([
      TimeOffRequestModel.countDocuments(filter),
      TimeOffRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'firstName lastName email')
        .lean(),
    ]);

    res.json(ok(items, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function createSickRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = requireEmployeeAuth(req);
    const payload = req.body as Record<string, unknown>;

    const startDate = payload.startDate as Date;
    const endDate = payload.endDate as Date;
    if (endDate.getTime() < startDate.getTime()) {
      res.status(400).json({ success: false, message: 'End date must be after start date' });
      return;
    }

    const item = await TimeOffRequestModel.create({
      organizationId: orgId,
      employeeId,
      type: 'sick',
      startDate,
      endDate,
      note: payload.note ? String(payload.note) : undefined,
      status: 'pending',
    });

    const managers = await UserModel.find({ organizationId: orgId, role: { $in: ['owner', 'manager'] }, isActive: true })
      .select('_id')
      .lean();
    for (const m of managers) {
      await createNotification({
        organizationId: orgId,
        userId: m._id,
        type: 'schedule_change',
        title: 'Sick request pending',
        message: 'A sick request requires review.',
        relatedEntity: { entityType: 'time_off', entityId: item._id },
      });
    }

    res.status(201).json(ok(item));
  } catch (err) {
    next(err);
  }
}

export async function cancelTimeOff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { employeeId, orgId } = requireEmployeeAuth(req);
    const item = await TimeOffRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (item.employeeId.toString() !== employeeId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (item.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Only pending requests can be cancelled' });
      return;
    }
    item.status = 'cancelled';
    await item.save();
    res.json(ok(item.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function approveTimeOff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const reviewerId = req.user?.id;
    if (!organizationId || !reviewerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);
    const item = await TimeOffRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (item.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Request is not pending' });
      return;
    }
    item.status = 'approved';
    item.reviewedBy = new Types.ObjectId(reviewerId);
    item.reviewedAt = new Date();
    item.managerNote = req.body.managerNote ? String(req.body.managerNote) : undefined;
    await item.save();
    res.json(ok(item.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function rejectTimeOff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const reviewerId = req.user?.id;
    if (!organizationId || !reviewerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);
    const item = await TimeOffRequestModel.findOne({ _id: req.params.id, organizationId: orgId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (item.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Request is not pending' });
      return;
    }
    item.status = 'rejected';
    item.reviewedBy = new Types.ObjectId(reviewerId);
    item.reviewedAt = new Date();
    item.managerNote = req.body.managerNote ? String(req.body.managerNote) : undefined;
    await item.save();
    res.json(ok(item.toJSON()));
  } catch (err) {
    next(err);
  }
}

