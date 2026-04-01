import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const positionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
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

positionSchema.index({ organizationId: 1, departmentId: 1, name: 1 }, { unique: true });

export type Position = InferSchemaType<typeof positionSchema> & { _id: Types.ObjectId };
export type PositionModel = Model<Position>;

export const PositionModel: PositionModel =
  (mongoose.models.Position as PositionModel) || mongoose.model<Position>('Position', positionSchema);

