import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const timeOffRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, required: true, enum: ['sick'], default: 'sick', index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    note: { type: String, required: false, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    reviewedAt: { type: Date, required: false },
    managerNote: { type: String, required: false, trim: true },
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

timeOffRequestSchema.index({ organizationId: 1, employeeId: 1, status: 1, createdAt: -1 });
timeOffRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export type TimeOffRequest = InferSchemaType<typeof timeOffRequestSchema> & { _id: Types.ObjectId };
export type TimeOffRequestModel = Model<TimeOffRequest>;

export const TimeOffRequestModel: TimeOffRequestModel =
  (mongoose.models.TimeOffRequest as TimeOffRequestModel) ||
  mongoose.model<TimeOffRequest>('TimeOffRequest', timeOffRequestSchema);

