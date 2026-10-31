import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { SCOPES } from "@/lib/auth/scopes";

const apiTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    tokenHash: { type: String, required: true, unique: true },
    scopes: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) =>
          value.length > 0 && value.every((scope) => (SCOPES as readonly string[]).includes(scope)),
        message: "Unknown scope",
      },
    },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { collection: "apiTokens", versionKey: false },
);

export type ApiTokenAttributes = InferSchemaType<typeof apiTokenSchema>;

export const ApiToken: Model<ApiTokenAttributes> =
  (models.ApiToken as Model<ApiTokenAttributes>) ??
  model<ApiTokenAttributes>("ApiToken", apiTokenSchema);
