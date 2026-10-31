type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn", event: string, fields: LogFields) {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Structured server logging. Never pass form text, answers, or personal data. */
export function logEvent(event: string, fields: LogFields = {}) {
  write("info", event, fields);
}

export function logWarn(event: string, fields: LogFields = {}) {
  write("warn", event, fields);
}
