import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { NotificationModel } from '../models';
import { ok } from '../utils/api';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (req.user) {
      filter.$or = [{ userId: new Types.ObjectId(req.user.id) }, { role: req.user.role }];
    } else if (req.employee) {
      const ors: Record<string, unknown>[] = [{ role: 'employee' }];
      if (req.employee.departmentId) ors.push({ departmentId: new Types.ObjectId(req.employee.departmentId) });
      filter.$or = ors;
    }

    const [total, notifications] = await Promise.all([
      NotificationModel.countDocuments(filter),
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    res.json(ok(notifications, undefined, buildPaginationMeta(page, limit, total)));
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { $set: { isRead: true } },
      { new: true },
    ).lean();

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json(ok(notification));
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    // Mark all scoped notifications read is handled by simply marking all org notifications read for now.
    await NotificationModel.updateMany({ organizationId: orgId, isRead: false }, { $set: { isRead: true } });
    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const deleted = await NotificationModel.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? req.employee?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const filter: Record<string, unknown> = { organizationId: orgId, isRead: false };
    if (req.user) {
      filter.$or = [{ userId: new Types.ObjectId(req.user.id) }, { role: req.user.role }];
    } else if (req.employee) {
      const ors: Record<string, unknown>[] = [{ role: 'employee' }];
      if (req.employee.departmentId) ors.push({ departmentId: new Types.ObjectId(req.employee.departmentId) });
      filter.$or = ors;
    }

    const count = await NotificationModel.countDocuments(filter);
    res.json(ok({ count }));
  } catch (err) {
    next(err);
  }
}

