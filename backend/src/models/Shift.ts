import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

function parseHHmmToMinutes(value: string): number | null {
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const [hhRaw, mmRaw] = parts;
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

const shiftSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    location: { type: String, required: false, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    notes: { type: String, required: false, trim: true },
    actualStartTime: { type: String, required: false, trim: true },
    actualEndTime: { type: String, required: false, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

shiftSchema.virtual('hoursWorked').get(function (this: {
  startTime: string;
  endTime: string;
}): number {
  const start = parseHHmmToMinutes(this.startTime);
  const end = parseHHmmToMinutes(this.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
});

shiftSchema.index({ organizationId: 1, employeeId: 1, date: 1 });

export type Shift = InferSchemaType<typeof shiftSchema> & {
  _id: Types.ObjectId;
  hoursWorked: number;
};

export type ShiftModel = Model<Shift>;

export const ShiftModel: ShiftModel =
  (mongoose.models.Shift as ShiftModel) || mongoose.model<Shift>('Shift', shiftSchema);

