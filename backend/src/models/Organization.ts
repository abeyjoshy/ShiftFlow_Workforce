import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const organizationSettingsSchema = new mongoose.Schema(
  {
    timezone: { type: String, required: true, default: 'UTC' },
    weekStartDay: { type: Number, required: true, default: 1, min: 0, max: 6 },
    maxShiftHours: { type: Number, required: true, default: 12, min: 1, max: 24 },
  },
  { _id: false },
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    industry: {
      type: String,
      required: true,
      enum: ['Restaurant', 'Retail', 'Healthcare', 'Corporate Office', 'Warehouse / Logistics'],
      default: 'Restaurant',
    },
    plan: {
      type: String,
      required: true,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    settings: { type: organizationSettingsSchema, required: true, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type Organization = InferSchemaType<typeof organizationSchema>;

export type OrganizationModel = Model<Organization>;

export const OrganizationModel: OrganizationModel =
  (mongoose.models.Organization as OrganizationModel) ||
  mongoose.model<Organization>('Organization', organizationSchema);

