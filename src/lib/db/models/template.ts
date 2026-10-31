import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const templateFieldSchema = new Schema(
  {
    key: { type: String, required: true, maxlength: 64 },
    question: { type: String, required: true, maxlength: 300 },
    plainQuestion: { type: String, required: true, maxlength: 220 },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
  },
  { _id: false },
);

const templateSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 300 },
    category: { type: String, required: true, maxlength: 60 },
    fields: { type: [templateFieldSchema], default: [] },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: "templates", versionKey: false },
);

templateSchema.index({ visibility: 1, category: 1 });

export type TemplateAttributes = InferSchemaType<typeof templateSchema>;

export const Template: Model<TemplateAttributes> =
  (models.Template as Model<TemplateAttributes>) ??
  model<TemplateAttributes>("Template", templateSchema);
