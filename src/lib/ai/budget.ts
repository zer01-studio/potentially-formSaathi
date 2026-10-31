import { logWarn } from "@/lib/security/log";

type BudgetEntry = {
  day: string;
  count: number;
};

const MAX_TRACKED_USERS = 10_000;
const usage = new Map<string, BudgetEntry>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * In-memory per-user daily AI budget. One unit is consumed per AI operation
 * (a retry caused by invalid output shares the same unit). Move this to Redis
 * or MongoDB if multiple app instances must share a budget.
 */
export function consumeAiBudget(userId: string, limit: number): boolean {
  if (limit <= 0) return false;

  const day = today();
  const existing = usage.get(userId);

  if (!existing || existing.day !== day) {
    if (usage.size >= MAX_TRACKED_USERS) {
      for (const [key, entry] of usage) {
        if (entry.day !== day) usage.delete(key);
      }
      if (usage.size >= MAX_TRACKED_USERS) {
        const oldest = usage.keys().next().value;
        if (oldest !== undefined) usage.delete(oldest);
      }
    }

    usage.set(userId, { day, count: 1 });
    return true;
  }

  if (existing.count >= limit) {
    logWarn("ai.budget_exhausted", { limit });
    return false;
  }

  existing.count += 1;
  return true;
}

export function aiBudgetUsedToday(userId: string): number {
  const entry = usage.get(userId);
  return entry && entry.day === today() ? entry.count : 0;
}
