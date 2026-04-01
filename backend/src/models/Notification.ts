import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const relatedEntitySchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    role: { type: String, required: false, enum: ['owner', 'manager', 'employee'], index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'shift_published',
        'swap_request',
        'swap_approved',
        'swap_rejected',
        'shift_reminder',
        'schedule_change',
      ],
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, required: true, default: false, index: true },
    relatedEntity: { type: relatedEntitySchema, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

notificationSchema.index({ organizationId: 1, userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, role: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, departmentId: 1, isRead: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof notificationSchema> & {
  _id: Types.ObjectId;
};

export type NotificationModel = Model<Notification>;

export const NotificationModel: NotificationModel =
  (mongoose.models.Notification as NotificationModel) ||
  mongoose.model<Notification>('Notification', notificationSchema);

