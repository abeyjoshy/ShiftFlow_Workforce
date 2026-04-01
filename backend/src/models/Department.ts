import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
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

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export type Department = InferSchemaType<typeof departmentSchema> & { _id: Types.ObjectId };
export type DepartmentModel = Model<Department>;

export const DepartmentModel: DepartmentModel =
  (mongoose.models.Department as DepartmentModel) ||
  mongoose.model<Department>('Department', departmentSchema);

