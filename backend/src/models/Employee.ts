import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const employeeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false, select: false },
    canLogin: { type: Boolean, required: true, default: false, index: true },
    phone: { type: String, required: false, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true, index: true },
    employmentType: {
      type: String,
      required: true,
      enum: ['full-time', 'part-time', 'casual'],
    },
    hourlyRate: { type: Number, required: false, min: 0 },
    weeklyHours: { type: Number, required: false, min: 0 },
    availability: { type: [availabilitySchema], required: true, default: [] },
    isActive: { type: Boolean, required: true, default: true, index: true },
    lastLogin: { type: Date, required: false },
    hireDate: { type: Date, required: false },
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

employeeSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export type Employee = InferSchemaType<typeof employeeSchema> & {
  _id: Types.ObjectId;
};

export type EmployeeModel = Model<Employee>;

export const EmployeeModel: EmployeeModel =
  (mongoose.models.Employee as EmployeeModel) ||
  mongoose.model<Employee>('Employee', employeeSchema);

