import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const swapRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    requestedShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true, index: true },
    targetEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    offeredShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false, index: true },
    targetStatus: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
    targetRespondedAt: { type: Date, required: false },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    requesterNote: { type: String, required: false, trim: true },
    managerNote: { type: String, required: false, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    reviewedAt: { type: Date, required: false },
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

swapRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
swapRequestSchema.index({ organizationId: 1, targetEmployeeId: 1, targetStatus: 1, createdAt: -1 });

export type SwapRequest = InferSchemaType<typeof swapRequestSchema> & {
  _id: Types.ObjectId;
};

export type SwapRequestModel = Model<SwapRequest>;

export const SwapRequestModel: SwapRequestModel =
  (mongoose.models.SwapRequest as SwapRequestModel) ||
  mongoose.model<SwapRequest>('SwapRequest', swapRequestSchema);

