import { apiSuccess } from "@/lib/api/response";
import { withApi } from "@/lib/api/handler";
import { connectDb } from "@/lib/db/connect";
import { services, voiceCapabilities } from "@/lib/env";

export const runtime = "nodejs";

export const GET = withApi({ auth: "none" }, async () => {
  let database = false;
  if (services.database) {
    try {
      await connectDb();
      database = true;
    } catch {
      database = false;
    }
  }

  return apiSuccess({
    status: database ? "ok" : "degraded",
    time: new Date().toISOString(),
    services: {
      gemma: services.gemma ? "active" : "demo",
      elevenlabs: voiceCapabilities.tts
        ? "active"
        : voiceCapabilities.stt
          ? "configured"
          : "demo",
      ocr: services.ocr ? "ready" : "demo",
      database: database ? "connected" : "unavailable",
    },
  });
});
