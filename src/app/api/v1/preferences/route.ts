import { z } from "zod";
import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireAuth, requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { voiceCapabilities } from "@/lib/env";

export const runtime = "nodejs";

const updatePreferencesSchema = z
  .strictObject({
    voiceRepliesEnabled: z.boolean().optional(),
    contextSavingEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.voiceRepliesEnabled !== undefined ||
      value.contextSavingEnabled !== undefined,
    { message: "Nothing to update." },
  );

function capabilities() {
  return {
    ttsAvailable: voiceCapabilities.tts,
    sttAvailable: voiceCapabilities.stt,
  };
}

function preferencesFromUser(user: {
  voiceRepliesEnabled?: boolean | null;
  contextSavingEnabled?: boolean | null;
}) {
  return {
    voiceRepliesEnabled: Boolean(user.voiceRepliesEnabled),
    contextSavingEnabled: user.contextSavingEnabled !== false,
  };
}

export const GET = withApi({ auth: "required" }, async ({ auth }) => {
  requireAuth(auth);
  await connectDb();

  const user = await User.findById(auth.userId)
    .select("voiceRepliesEnabled contextSavingEnabled")
    .lean();

  if (!user) {
    throw new ApiHttpError(404, "not_found", "We couldn’t find your account.");
  }

  return apiSuccess({
    preferences: preferencesFromUser(user),
    voice: capabilities(),
  });
});

export const PATCH = withApi({ auth: "required" }, async ({ request, auth }) => {
  requireSessionAuth(auth);

  const body = parseWithSchema(
    updatePreferencesSchema,
    await readJsonBody(request),
  );

  const $set: Record<string, boolean> = {};
  if (body.voiceRepliesEnabled !== undefined) {
    $set.voiceRepliesEnabled = body.voiceRepliesEnabled;
  }
  if (body.contextSavingEnabled !== undefined) {
    $set.contextSavingEnabled = body.contextSavingEnabled;
  }

  await connectDb();
  const user = await User.findByIdAndUpdate(
    auth.userId,
    { $set },
    { new: true },
  )
    .select("voiceRepliesEnabled contextSavingEnabled")
    .lean();

  if (!user) {
    throw new ApiHttpError(404, "not_found", "We couldn’t find your account.");
  }

  return apiSuccess({
    preferences: preferencesFromUser(user),
    voice: capabilities(),
  });
});
