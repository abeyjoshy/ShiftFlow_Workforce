import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { ShiftModel } from '../models';
import { ok } from '../utils/api';

function parseHHmmToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const [hh, mm] = value.split(':').map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export async function onShiftNow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const shifts = await ShiftModel.find({
      organizationId: orgId,
      date: { $gte: start, $lt: end },
      status: { $in: ['published', 'draft'] },
    })
      .sort({ startTime: 1 })
      .populate('employeeId', 'firstName lastName email')
      .lean();

    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();

    const items = shifts.map((s) => {
      const scheduledStart = parseHHmmToMinutes(String(s.startTime));
      const scheduledEnd = parseHHmmToMinutes(String(s.endTime));
      const isScheduledNow =
        scheduledStart !== null && scheduledEnd !== null ? nowMins >= scheduledStart && nowMins <= scheduledEnd : false;
      const isClockedIn = Boolean(s.actualStartTime) && !s.actualEndTime;
      const isClockedOut = Boolean(s.actualStartTime) && Boolean(s.actualEndTime);
      return {
        shift: s,
        isScheduledNow,
        isClockedIn,
        isClockedOut,
      };
    });

    res.json(ok({ now: now.toISOString(), items }));
  } catch (err) {
    next(err);
  }
}

