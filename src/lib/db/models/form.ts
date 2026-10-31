import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { EXTRACTION_MODES, FIELD_TYPES, SOURCE_TYPES } from "@/lib/forms/types";

const formFieldSchema = new Schema(
  {
    key: { type: String, required: true, maxlength: 64 },
    question: { type: String, required: true, maxlength: 300 },
    plainQuestion: { type: String, required: true, maxlength: 220 },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, default: false },
    helpText: { type: String, maxlength: 160 },
    options: { type: [String], default: undefined },
    maxLength: { type: Number, min: 1, max: 2000 },
  },
  { _id: false },
);

const formSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    sourceLabel: { type: String, required: true, maxlength: 120 },
    contentHash: { type: String, required: true, maxlength: 64 },
    title: { type: String, required: true, maxlength: 160 },
    fields: { type: [formFieldSchema], default: [] },
    extractionMode: { type: String, enum: EXTRACTION_MODES, required: true },
    demoFallback: { type: Boolean, default: false },
    aiEnhanced: { type: Boolean, default: false },
    extractionNote: { type: String, maxlength: 300 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "forms", versionKey: false },
);

formSchema.index({ userId: 1, createdAt: -1 });

export type FormAttributes = InferSchemaType<typeof formSchema>;

export const Form: Model<FormAttributes> =
  (models.Form as Model<FormAttributes>) ?? model<FormAttributes>("Form", formSchema);
