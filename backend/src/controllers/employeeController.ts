import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { getEnv } from '../config/env';
import { EmployeeModel, ShiftModel } from '../models';
import { ok } from '../utils/api';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
    const positionId = typeof req.query.positionId === 'string' ? req.query.positionId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const filter: Record<string, unknown> = { organizationId: orgObjectId };
    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    if (positionId) filter.positionId = new Types.ObjectId(positionId);
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const [total, employees] = await Promise.all([
      EmployeeModel.countDocuments(filter),
      EmployeeModel.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json(ok(employees, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const orgObjectId = new Types.ObjectId(organizationId);

    const payload = req.body as Record<string, unknown>;
    const canLogin = Boolean(payload.canLogin);
    const env = getEnv();
    const password = typeof payload.password === 'string' ? payload.password : undefined;
    const passwordHash = canLogin && password ? await bcrypt.hash(password, env.bcryptRounds) : undefined;
    const employee = await EmployeeModel.create({
      organizationId: orgObjectId,
      firstName: String(payload.firstName),
      lastName: String(payload.lastName),
      email: String(payload.email).toLowerCase(),
      canLogin,
      passwordHash,
      phone: payload.phone ? String(payload.phone) : undefined,
      departmentId: new Types.ObjectId(String(payload.departmentId)),
      positionId: new Types.ObjectId(String(payload.positionId)),
      employmentType: String(payload.employmentType),
      hourlyRate: typeof payload.hourlyRate === 'number' ? payload.hourlyRate : undefined,
      weeklyHours: typeof payload.weeklyHours === 'number' ? payload.weeklyHours : undefined,
      hireDate: payload.hireDate instanceof Date ? payload.hireDate : undefined,
      availability: [],
      isActive: true,
    });

    res.status(201).json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const employee = await EmployeeModel.findOne({ _id: req.params.id, organizationId: orgObjectId }).lean();
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const patch = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    const fields = [
      'firstName',
      'lastName',
      'departmentId',
      'positionId',
      'employmentType',
      'phone',
      'hourlyRate',
      'weeklyHours',
      'isActive',
      'hireDate',
      'canLogin',
    ] as const;

    for (const key of fields) {
      if (patch[key] !== undefined) update[key] = patch[key];
    }
    if (patch.email !== undefined) update.email = String(patch.email).toLowerCase();

    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgObjectId },
      { $set: update },
      { new: true },
    ).lean();

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function deactivateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgObjectId },
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const { availability } = req.body as { availability: unknown };
    const blocks = Array.isArray(availability) ? availability : [];

    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgObjectId },
      { $set: { availability: blocks } },
      { new: true },
    ).lean();

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

    const filter: Record<string, unknown> = {
      organizationId: orgObjectId,
      employeeId: new Types.ObjectId(String(req.params.id)),
    };

    const startDate = req.query.startDate instanceof Date ? req.query.startDate : undefined;
    const endDate = req.query.endDate instanceof Date ? req.query.endDate : undefined;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = startDate;
      if (endDate) (filter.date as Record<string, unknown>).$lte = endDate;
    }

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status) filter.status = status;

    const [total, shifts] = await Promise.all([
      ShiftModel.countDocuments(filter),
      ShiftModel.find(filter).sort({ date: 1, startTime: 1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json(ok(shifts, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function employeeDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);
    const employees = await EmployeeModel.find({ organizationId: orgId, isActive: true })
      .select('_id firstName lastName email departmentId positionId')
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    res.json(ok(employees));
  } catch (err) {
    next(err);
  }
}

