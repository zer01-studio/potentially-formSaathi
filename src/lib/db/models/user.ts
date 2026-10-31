import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "users", versionKey: false },
);

export type UserAttributes = InferSchemaType<typeof userSchema>;

export const User: Model<UserAttributes> =
  (models.User as Model<UserAttributes>) ?? model<UserAttributes>("User", userSchema);
