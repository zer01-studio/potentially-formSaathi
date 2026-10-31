import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { MAX_ANSWER_LENGTH } from "@/lib/forms/types";

const answerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    formId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    fieldKey: { type: String, required: true, maxlength: 64 },
    value: { type: String, required: true, maxlength: MAX_ANSWER_LENGTH },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: "answers", versionKey: false },
);

answerSchema.index({ userId: 1, formId: 1, fieldKey: 1 }, { unique: true });

export type AnswerAttributes = InferSchemaType<typeof answerSchema>;

export const Answer: Model<AnswerAttributes> =
  (models.Answer as Model<AnswerAttributes>) ??
  model<AnswerAttributes>("Answer", answerSchema);
