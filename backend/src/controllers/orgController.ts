import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { OrganizationModel, EmployeeModel, ShiftModel, SwapRequestModel } from '../models';
import { ok } from '../utils/api';

export async function getOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const org = await OrganizationModel.findById(organizationId).lean();
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.json(ok(org));
  } catch (err) {
    next(err);
  }
}

export async function updateOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const patch = req.body as Record<string, unknown>;

    const update: Record<string, unknown> = {};
    if (typeof patch.name === 'string') update.name = patch.name;
    if (patch.settings && typeof patch.settings === 'object') {
      const settings = patch.settings as Record<string, unknown>;
      if (typeof settings.timezone === 'string') update['settings.timezone'] = settings.timezone;
      if (typeof settings.weekStartDay === 'number') update['settings.weekStartDay'] = settings.weekStartDay;
      if (typeof settings.maxShiftHours === 'number') update['settings.maxShiftHours'] = settings.maxShiftHours;
    }

    const org = await OrganizationModel.findByIdAndUpdate(organizationId, { $set: update }, { new: true }).lean();
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.json(ok(org));
  } catch (err) {
    next(err);
  }
}

function startOfWeek(d: Date, weekStartDay: number): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const currentDay = date.getUTCDay();
  const diff = (currentDay - weekStartDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function getOrgStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const org = await OrganizationModel.findById(organizationId).lean();
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const now = new Date();
    const weekStart = startOfWeek(now, org.settings.weekStartDay ?? 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const orgObjectId = new Types.ObjectId(organizationId);

    const [totalEmployees, shiftsThisWeek, openSwaps] = await Promise.all([
      EmployeeModel.countDocuments({ organizationId: orgObjectId, isActive: true }),
      ShiftModel.countDocuments({
        organizationId: orgObjectId,
        date: { $gte: weekStart, $lt: weekEnd },
      }),
      SwapRequestModel.countDocuments({ organizationId: orgObjectId, status: 'pending' }),
    ]);

    // Hours summary via aggregation on virtual isn't possible; compute from stored times (approx).
    const shifts = await ShiftModel.find({
      organizationId: orgObjectId,
      date: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ['published', 'completed'] },
    })
      .select('startTime endTime')
      .lean();

    const hours = shifts.reduce((sum, s) => {
      const [sh, sm] = String(s.startTime).split(':').map(Number);
      const [eh, em] = String(s.endTime).split(':').map(Number);
      if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) return sum;
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      return sum + diff / 60;
    }, 0);

    res.json(
      ok({
        totalEmployees,
        shiftsThisWeek,
        openSwaps,
        hoursSummary: Math.round(hours * 100) / 100,
      }),
    );
  } catch (err) {
    next(err);
  }
}

