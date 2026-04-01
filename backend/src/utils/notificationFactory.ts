import { Types } from 'mongoose';

import { NotificationModel } from '../models';

export type NotificationType =
  | 'shift_published'
  | 'swap_request'
  | 'swap_approved'
  | 'swap_rejected'
  | 'shift_reminder'
  | 'schedule_change';

export async function createNotification(input: {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  role?: 'owner' | 'manager' | 'employee';
  departmentId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: { entityType: string; entityId: Types.ObjectId };
}): Promise<void> {
  await NotificationModel.create({
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    departmentId: input.departmentId,
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    relatedEntity: input.relatedEntity,
  });
}

