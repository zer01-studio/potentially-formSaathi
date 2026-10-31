import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { CONTEXT_CATEGORIES } from "@/lib/context/types";

const contextItemSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: CONTEXT_CATEGORIES,
      required: true,
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    value: { type: String, required: true, trim: true, maxlength: 2000 },
    key: { type: String, trim: true, maxlength: 40, default: null },
    autofillKey: { type: String, trim: true, maxlength: 40, default: null },
    source: {
      type: String,
      enum: ["manual", "form_answer"],
      default: "manual",
    },
    sourceFormId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      default: null,
    },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: "contextItems", versionKey: false },
);

contextItemSchema.index({ userId: 1, updatedAt: -1 });
contextItemSchema.index({ userId: 1, key: 1 });
contextItemSchema.index({ userId: 1, autofillKey: 1 });

export type ContextItemAttributes = InferSchemaType<typeof contextItemSchema>;

export const ContextItem: Model<ContextItemAttributes> =
  (models.ContextItem as Model<ContextItemAttributes>) ??
  model<ContextItemAttributes>("ContextItem", contextItemSchema);
