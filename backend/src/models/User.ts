import mongoose, { type InferSchemaType, type Model, type Types } from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['owner', 'manager', 'employee'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, required: false, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    lastLogin: { type: Date, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export type User = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
};

export type UserModel = Model<User>;

export const UserModel: UserModel =
  (mongoose.models.User as UserModel) || mongoose.model<User>('User', userSchema);

