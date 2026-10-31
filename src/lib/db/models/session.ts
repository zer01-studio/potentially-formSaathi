import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
  },
  { collection: "sessions", versionKey: false },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionAttributes = InferSchemaType<typeof sessionSchema>;

export const Session: Model<SessionAttributes> =
  (models.Session as Model<SessionAttributes>) ??
  model<SessionAttributes>("Session", sessionSchema);
