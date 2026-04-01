import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { EmployeeModel, ShiftModel, UserModel } from '../models';
import { ok } from '../utils/api';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function startOfWeek(d: Date, weekStartDay: number): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const currentDay = date.getUTCDay();
  const diff = (currentDay - weekStartDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function listShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

    const filter: Record<string, unknown> = { organizationId: orgObjectId };

    if (req.employee) {
      filter.employeeId = new Types.ObjectId(req.employee.id);
    }

    if (typeof req.query.employeeId === 'string') filter.employeeId = new Types.ObjectId(req.query.employeeId);
    if (typeof req.query.status === 'string') filter.status = req.query.status;
    // Department/position filtering will be refactored to departmentId/positionId in shift model later.

    const parseDateQuery = (v: unknown): Date | undefined => {
      if (v instanceof Date) return v;
      if (typeof v === 'string' && v.trim()) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d;
      }
      return undefined;
    };
    const startDate = parseDateQuery(req.query.startDate);
    const endDate = parseDateQuery(req.query.endDate);
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = startDate;
      if (endDate) (filter.date as Record<string, unknown>).$lte = endDate;
    }

    const [total, shifts] = await Promise.all([
      ShiftModel.countDocuments(filter),
      ShiftModel.find(filter).sort({ date: 1, startTime: 1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json(ok(shifts, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

async function assertNoOverlap(input: {
  organizationId: Types.ObjectId;
  employeeId: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  ignoreShiftId?: Types.ObjectId;
}): Promise<void> {
  const shifts = await ShiftModel.find({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    date: input.date,
    ...(input.ignoreShiftId ? { _id: { $ne: input.ignoreShiftId } } : {}),
  })
    .select('startTime endTime')
    .lean();

  const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const ns = toMinutes(input.startTime);
  const ne = toMinutes(input.endTime);
  for (const s of shifts) {
    const es = toMinutes(String(s.startTime));
    const ee = toMinutes(String(s.endTime));
    const overlap = ns < ee && ne > es && sameDay(input.date, input.date);
    if (overlap) throw new Error('Overlapping shift for employee');
  }
}

export async function createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const managerId = req.user?.id;
    if (!organizationId || !managerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);
    const managerObjectId = new Types.ObjectId(managerId);

    const payload = req.body as Record<string, unknown>;
    const employeeObjectId = new Types.ObjectId(String(payload.employeeId));
    const date = payload.date as Date;

    await assertNoOverlap({
      organizationId: orgObjectId,
      employeeId: employeeObjectId,
      date,
      startTime: String(payload.startTime),
      endTime: String(payload.endTime),
    });

    const shift = await ShiftModel.create({
      organizationId: orgObjectId,
      employeeId: employeeObjectId,
      managerId: managerObjectId,
      date,
      startTime: String(payload.startTime),
      endTime: String(payload.endTime),
      position: String(payload.position),
      location: payload.location ? String(payload.location) : undefined,
      status: payload.status ? String(payload.status) : 'draft',
      notes: payload.notes ? String(payload.notes) : undefined,
    });

    res.status(201).json(ok(shift));
  } catch (err) {
    next(err);
  }
}

export async function bulkCreateShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    const managerId = req.user?.id;
    if (!organizationId || !managerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);
    const managerObjectId = new Types.ObjectId(managerId);

    const { shifts } = req.body as { shifts: Array<Record<string, unknown>> };

    const created: unknown[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < shifts.length; i += 1) {
      const s = shifts[i];
      try {
        const employeeObjectId = new Types.ObjectId(String(s.employeeId));
        const date = s.date as Date;
        await assertNoOverlap({
          organizationId: orgObjectId,
          employeeId: employeeObjectId,
          date,
          startTime: String(s.startTime),
          endTime: String(s.endTime),
        });

        const shift = await ShiftModel.create({
          organizationId: orgObjectId,
          employeeId: employeeObjectId,
          managerId: managerObjectId,
          date,
          startTime: String(s.startTime),
          endTime: String(s.endTime),
          position: String(s.position),
          location: s.location ? String(s.location) : undefined,
          status: s.status ? String(s.status) : 'draft',
          notes: s.notes ? String(s.notes) : undefined,
        });
        created.push(shift);
      } catch (e) {
        errors.push({ index: i, message: e instanceof Error ? e.message : 'Failed to create shift' });
      }
    }

    res.status(201).json(ok({ created: created.length, errors, shifts: created }));
  } catch (err) {
    next(err);
  }
}

export async function getShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const shift = await ShiftModel.findOne({ _id: req.params.id, organizationId: orgObjectId }).lean();
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    res.json(ok(shift));
  } catch (err) {
    next(err);
  }
}

export async function updateShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const shift = await ShiftModel.findOne({ _id: req.params.id, organizationId: orgObjectId });
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    const patch = req.body as Record<string, unknown>;
    const oldStatus = shift.status;

    if (patch.date instanceof Date) shift.date = patch.date;
    if (typeof patch.startTime === 'string') shift.startTime = patch.startTime;
    if (typeof patch.endTime === 'string') shift.endTime = patch.endTime;
    if (typeof patch.position === 'string') shift.position = patch.position;
    if (patch.location !== undefined) shift.location = patch.location ? String(patch.location) : undefined;
    if (patch.status !== undefined) shift.status = String(patch.status) as typeof shift.status;
    if (patch.notes !== undefined) shift.notes = patch.notes ? String(patch.notes) : undefined;
    if (patch.actualStartTime !== undefined)
      shift.actualStartTime = patch.actualStartTime ? String(patch.actualStartTime) : undefined;
    if (patch.actualEndTime !== undefined)
      shift.actualEndTime = patch.actualEndTime ? String(patch.actualEndTime) : undefined;

    await assertNoOverlap({
      organizationId: orgObjectId,
      employeeId: shift.employeeId as Types.ObjectId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      ignoreShiftId: shift._id,
    });

    await shift.save();

    // Notification targeting will be refactored in notifications-scope todo.

    res.json(ok(shift.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function deleteShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const deleted = await ShiftModel.findOneAndDelete({ _id: req.params.id, organizationId: orgObjectId }).lean();
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

export async function publishShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const shift = await ShiftModel.findOne({ _id: req.params.id, organizationId: orgObjectId });
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    shift.status = 'published';
    await shift.save();

    // Notification targeting will be refactored in notifications-scope todo.

    res.json(ok(shift.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function publishWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const weekStart = req.body.weekStart as Date;
    const end = new Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 7);

    const shifts = await ShiftModel.find({
      organizationId: orgObjectId,
      date: { $gte: weekStart, $lt: end },
      status: 'draft',
    });

    for (const shift of shifts) {
      shift.status = 'published';
      await shift.save();

      // Notification targeting will be refactored in notifications-scope todo.
    }

    res.json(ok({ published: shifts.length }));
  } catch (err) {
    next(err);
  }
}

export async function weekSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgObjectId = new Types.ObjectId(organizationId);

    const weekStart = req.query.weekStart as unknown as Date;
    const end = new Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 7);

    const employeeFilter: Record<string, unknown> = { organizationId: orgObjectId, isActive: true };
    if (req.employee) {
      employeeFilter._id = new Types.ObjectId(req.employee.id);
    }

    const employees = await EmployeeModel.find(employeeFilter).sort({ lastName: 1, firstName: 1 }).lean();

    const shiftFilter: Record<string, unknown> = { organizationId: orgObjectId, date: { $gte: weekStart, $lt: end } };
    if (req.employee) shiftFilter.employeeId = new Types.ObjectId(req.employee.id);

    const shifts = await ShiftModel.find(shiftFilter)
      .sort({ date: 1, startTime: 1 })
      .lean();

    const weekDays: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      weekDays.push(d.toISOString().slice(0, 10));
    }

    res.json(ok({ employees, shifts, weekDays }));
  } catch (err) {
    next(err);
  }
}

function hhmmNowUtc(): string {
  const d = new Date();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function employeeClockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.employee) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(req.employee.organizationId);
    const employeeId = new Types.ObjectId(req.employee.id);

    const shift = await ShiftModel.findOne({ _id: req.params.id, organizationId: orgId, employeeId });
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    if (shift.actualStartTime) {
      res.status(400).json({ success: false, message: 'Already clocked in' });
      return;
    }

    shift.actualStartTime = hhmmNowUtc();
    await shift.save();
    res.json(ok(shift.toJSON()));
  } catch (err) {
    next(err);
  }
}

export async function employeeClockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.employee) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(req.employee.organizationId);
    const employeeId = new Types.ObjectId(req.employee.id);

    const shift = await ShiftModel.findOne({ _id: req.params.id, organizationId: orgId, employeeId });
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    if (!shift.actualStartTime) {
      res.status(400).json({ success: false, message: 'Clock in first' });
      return;
    }
    if (shift.actualEndTime) {
      res.status(400).json({ success: false, message: 'Already clocked out' });
      return;
    }

    shift.actualEndTime = hhmmNowUtc();
    await shift.save();
    res.json(ok(shift.toJSON()));
  } catch (err) {
    next(err);
  }
}

