export const SCOPES = [
  "context:read",
  "context:write",
  "forms:read",
  "autofill:read",
] as const;

export type Scope = (typeof SCOPES)[number];

export const ALL_SCOPES: readonly Scope[] = SCOPES;

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}
