"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copyright,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { SCOPES, type Scope } from "@/lib/auth/scopes";
import {
  AUTOFILL_KEYS,
  AUTOFILL_KEY_LABELS,
  CONTEXT_CATEGORIES,
  CONTEXT_CATEGORY_LABELS,
  type ContextItemDto,
  type ContextListResponse,
  type ContextCategory,
} from "@/lib/context/types";
import { cn } from "@/lib/utils";

type TokenDto = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

type ItemDraft = {
  category: ContextCategory;
  label: string;
  value: string;
  autofillKey: string;
};

type Message = { tone: "success" | "error"; text: string };

const SCOPE_LABELS: Record<Scope, string> = {
  "context:read": "Read saved context",
  "context:write": "Add or edit saved context",
  "forms:read": "Read forms and answers",
  "autofill:read": "Read the autofill profile",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const EMPTY_DRAFT: ItemDraft = {
  category: "identity",
  label: "",
  value: "",
  autofillKey: "",
};

function ItemFields({
  draft,
  onChange,
  disabled,
}: {
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5 text-[11px] font-medium text-foreground">
        Category
        <select
          value={draft.category}
          onChange={(event) =>
            onChange({ ...draft, category: event.target.value as ContextCategory })
          }
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-[12.5px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          {CONTEXT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CONTEXT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5 text-[11px] font-medium text-foreground">
        Label
        <Input
          value={draft.label}
          onChange={(event) => onChange({ ...draft, label: event.target.value })}
          disabled={disabled}
          maxLength={120}
          placeholder="e.g. Home address"
          className="h-10 text-[12.5px]"
        />
      </label>
      <label className="space-y-1.5 text-[11px] font-medium text-foreground sm:col-span-2">
        Value
        <textarea
          value={draft.value}
          onChange={(event) => onChange({ ...draft, value: event.target.value })}
          disabled={disabled}
          rows={2}
          maxLength={2000}
          placeholder="The detail you want FormSaathi to remember"
          className="w-full resize-y rounded-xl border border-border bg-background/70 px-3 py-2 text-[12.5px] leading-relaxed text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </label>
      <label className="space-y-1.5 text-[11px] font-medium text-foreground sm:col-span-2">
        Share for autofill
        <select
          value={draft.autofillKey}
          onChange={(event) =>
            onChange({ ...draft, autofillKey: event.target.value })
          }
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-[12.5px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Not shared with the extension</option>
          {AUTOFILL_KEYS.map((key) => (
            <option key={key} value={key}>
              {AUTOFILL_KEY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ContextExplorer() {
  const [items, setItems] = useState<ContextItemDto[] | null>(null);
  const [savingEnabled, setSavingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newDraft, setNewDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ItemDraft>(EMPTY_DRAFT);

  const [tokens, setTokens] = useState<TokenDto[] | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenScopes, setTokenScopes] = useState<Scope[]>(["autofill:read", "forms:read"]);
  const [newToken, setNewToken] = useState<{ token: string; warning: string } | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<ContextListResponse>("/api/v1/context/items", {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data.items);
        setSavingEnabled(data.savingEnabled);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMessage({
          tone: "error",
          text:
            error instanceof ApiClientError
              ? error.message
              : "We couldn’t load your saved context.",
        });
        setItems([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ tokens: TokenDto[] }>("/api/v1/tokens", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setTokens(data.tokens);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTokens([]);
      });
    return () => controller.abort();
  }, []);

  async function loadItems() {
    const data = await apiRequest<ContextListResponse>("/api/v1/context/items");
    setItems(data.items);
    setSavingEnabled(data.savingEnabled);
  }

  async function loadTokens() {
    const data = await apiRequest<{ tokens: TokenDto[] }>("/api/v1/tokens");
    setTokens(data.tokens);
  }

  async function toggleSaving(next: boolean) {
    setSavingEnabled(next);
    setMessage(null);
    try {
      await apiRequest("/api/v1/preferences", {
        method: "PATCH",
        body: { contextSavingEnabled: next },
      });
      setMessage({
        tone: "success",
        text: next
          ? "Context saving is on. Future answers can be reused."
          : "Context saving is off. Nothing new will be saved.",
      });
    } catch (error) {
      setSavingEnabled(!next);
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t save that preference.",
      });
    }
  }

  async function createItem() {
    if (!newDraft.label.trim() || !newDraft.value.trim()) {
      setMessage({ tone: "error", text: "Add a label and a value first." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest("/api/v1/context/items", {
        method: "POST",
        body: {
          category: newDraft.category,
          label: newDraft.label.trim(),
          value: newDraft.value.trim(),
          ...(newDraft.autofillKey ? { autofillKey: newDraft.autofillKey } : {}),
        },
      });
      setNewDraft(EMPTY_DRAFT);
      setAddOpen(false);
      await loadItems();
      setMessage({ tone: "success", text: "Detail saved." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t save that detail.",
      });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: ContextItemDto) {
    setEditId(item.id);
    setEditDraft({
      category: item.category,
      label: item.label,
      value: item.value,
      autofillKey: item.autofillKey ?? "",
    });
    setMessage(null);
  }

  async function saveEdit() {
    if (!editId || !editDraft.label.trim() || !editDraft.value.trim()) {
      setMessage({ tone: "error", text: "Add a label and a value first." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest(`/api/v1/context/items/${editId}`, {
        method: "PATCH",
        body: {
          category: editDraft.category,
          label: editDraft.label.trim(),
          value: editDraft.value.trim(),
          autofillKey: editDraft.autofillKey || null,
        },
      });
      setEditId(null);
      await loadItems();
      setMessage({ tone: "success", text: "Detail updated." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t update that detail.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest(`/api/v1/context/items/${id}`, { method: "DELETE" });
      setDeleteId(null);
      await loadItems();
      setMessage({ tone: "success", text: "Detail deleted." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t delete that detail.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest("/api/v1/context/items", { method: "DELETE" });
      setClearConfirm(false);
      setItems([]);
      setMessage({ tone: "success", text: "All saved details cleared." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t clear the saved details.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function issueToken() {
    if (!tokenName.trim() || tokenScopes.length === 0) {
      setMessage({ tone: "error", text: "Name the token and choose a scope." });
      return;
    }
    setTokenBusy(true);
    setMessage(null);
    try {
      const data = await apiRequest<{ token: string; warning: string }>(
        "/api/v1/tokens",
        {
          method: "POST",
          body: { name: tokenName.trim(), scopes: tokenScopes },
        },
      );
      setNewToken({ token: data.token, warning: data.warning });
      setTokenName("");
      await loadTokens();
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t issue that token.",
      });
    } finally {
      setTokenBusy(false);
    }
  }

  async function revokeToken(id: string) {
    setTokenBusy(true);
    setMessage(null);
    try {
      await apiRequest(`/api/v1/tokens/${id}`, { method: "DELETE" });
      setRevokeId(null);
      await loadTokens();
      setMessage({ tone: "success", text: "Token revoked." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t revoke that token.",
      });
    } finally {
      setTokenBusy(false);
    }
  }

  const grouped = CONTEXT_CATEGORIES.map((category) => ({
    category,
    items: (items ?? []).filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="inline-flex items-center gap-2 font-display text-[1.3rem] font-medium text-foreground">
              <Fingerprint className="size-4 text-primary" aria-hidden="true" />
              Save details for next time
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              When this is on, answers that map to a safe detail (name, email,
              phone, address) can prefill later forms. Free-text answers are
              never auto-saved. Nothing reaches the browser extension unless you
              mark an item “Share for autofill”.
            </p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              On by default in this preview. Turn it off to stop saving new
              details; existing details stay until you delete them.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={savingEnabled}
            aria-label="Save context from answers"
            onClick={() => void toggleSaving(!savingEnabled)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium transition-colors",
              savingEnabled
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "relative h-4 w-7 rounded-full",
                savingEnabled ? "bg-primary" : "bg-border",
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "absolute top-0.5 size-3 rounded-full bg-card transition-all",
                  savingEnabled ? "left-3.5" : "left-0.5",
                )}
              />
            </span>
            {savingEnabled ? "Saving on" : "Saving off"}
          </button>
        </div>
      </section>

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed",
            message.tone === "error"
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[1.25rem] font-medium text-foreground">
              Saved details
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAddOpen((open) => !open)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add detail
              </Button>
              {items && items.length > 0 ? (
                clearConfirm ? (
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClearConfirm(false)}
                      disabled={busy}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void clearAll()}
                      disabled={busy}
                    >
                      Confirm clear
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setClearConfirm(true)}
                    className="text-[11px] text-muted-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground"
                  >
                    Clear all
                  </button>
                )
              ) : null}
            </div>
          </div>

          {addOpen ? (
            <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft/20 p-4">
              <ItemFields
                draft={newDraft}
                onChange={setNewDraft}
                disabled={busy}
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => void createItem()} disabled={busy}>
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                  Save detail
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddOpen(false);
                    setNewDraft(EMPTY_DRAFT);
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              Loading saved details…
            </p>
          ) : grouped.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border-strong/60 bg-background/40 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Nothing saved yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Answer a form with saving on, or add a detail manually.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {grouped.map((group) => (
                <div key={group.category}>
                  <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {CONTEXT_CATEGORY_LABELS[group.category]}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-border/80 bg-background/40 p-3.5"
                      >
                        {editId === item.id ? (
                          <div>
                            <ItemFields
                              draft={editDraft}
                              onChange={setEditDraft}
                              disabled={busy}
                            />
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" onClick={() => void saveEdit()} disabled={busy}>
                                {busy ? (
                                  <LoaderCircle className="size-3.5 animate-spin" />
                                ) : null}
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditId(null)}
                                disabled={busy}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-medium text-foreground">
                                  {item.label}
                                </p>
                                <div className="mt-1 flex items-start gap-2">
                                  <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground/80">
                                    {item.value}
                                  </pre>
                                  <CopyButton value={item.value} />
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {deleteId === item.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void removeItem(item.id)}
                                      disabled={busy}
                                      className="rounded-full border border-danger/30 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-danger"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteId(null)}
                                      className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground"
                                    >
                                      Keep
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(item)}
                                      aria-label={`Edit ${item.label}`}
                                      className="inline-flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <Pencil className="size-3" aria-hidden="true" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteId(item.id)}
                                      aria-label={`Delete ${item.label}`}
                                      className="inline-flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                    >
                                      <Trash2 className="size-3" aria-hidden="true" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Copyright className="size-2.5" aria-hidden="true" />
                                {item.source === "form_answer" ? "From a form" : "Added manually"}
                                {" · "}
                                {formatDate(item.updatedAt)}
                              </span>
                              {item.autofillKey ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-success">
                                  <ShieldCheck className="size-2.5" aria-hidden="true" />
                                  Shared · {AUTOFILL_KEY_LABELS[item.autofillKey as keyof typeof AUTOFILL_KEY_LABELS] ?? item.autofillKey}
                                </span>
                              ) : (
                                <span className="rounded-full border border-border px-2 py-0.5">
                                  Private to this app
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <h2 className="inline-flex items-center gap-2 font-display text-[1.25rem] font-medium text-foreground">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            Device access
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            Issue a token for a future browser extension. Tokens are shown once
            and can be revoked here.
          </p>

          <div className="mt-4 space-y-2.5">
            <Input
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              maxLength={80}
              placeholder="Token name, e.g. Chrome extension"
              className="h-10 text-[12.5px]"
              aria-label="Token name"
            />
            <div className="space-y-1.5">
              {SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-[11px] text-foreground/80"
                >
                  <input
                    type="checkbox"
                    checked={tokenScopes.includes(scope)}
                    onChange={(event) => {
                      setTokenScopes((current) =>
                        event.target.checked
                          ? [...current, scope]
                          : current.filter((value) => value !== scope),
                      );
                    }}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  {SCOPE_LABELS[scope]}
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => void issueToken()}
              disabled={tokenBusy}
            >
              {tokenBusy ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="size-3.5" aria-hidden="true" />
              )}
              Issue token
            </Button>
          </div>

          {newToken ? (
            <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft/25 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-accent-strong">
                  Copy this token now
                </p>
                <CopyButton value={newToken.token} label="Copy token" />
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-foreground">
                {newToken.token}
              </pre>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {newToken.warning}
              </p>
            </div>
          ) : null}

          {tokens === null ? (
            <p className="mt-4 text-xs text-muted-foreground">Loading tokens…</p>
          ) : tokens.length === 0 ? (
            <p className="mt-4 text-[11px] text-muted-foreground">
              No tokens issued yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tokens.map((token) => {
                const revoked = Boolean(token.revokedAt);
                return (
                  <li
                    key={token.id}
                    className="rounded-xl border border-border/70 bg-background/40 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-medium text-foreground">
                          {token.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                          {token.scopes.join(" · ")}
                        </p>
                      </div>
                      {revoked ? (
                        <span className="rounded-full border border-danger/30 px-2 py-0.5 text-[8px] uppercase tracking-[0.08em] text-danger">
                          Revoked
                        </span>
                      ) : revokeId === token.id ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void revokeToken(token.id)}
                            disabled={tokenBusy}
                            className="rounded-full border border-danger/30 px-2 py-0.5 text-[8px] uppercase tracking-[0.08em] text-danger"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevokeId(null)}
                            className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRevokeId(token.id)}
                          className="text-[9px] text-muted-foreground underline underline-offset-4 hover:text-danger"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[9.5px] text-muted-foreground">
                      Created {formatDate(token.createdAt)}
                      {token.lastUsedAt ? ` · last used ${formatDate(token.lastUsedAt)}` : ""}
                      {token.expiresAt ? ` · expires ${formatDate(token.expiresAt)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
            <Check className="size-3 text-success" aria-hidden="true" />
            Only items marked “Share for autofill” appear in the extension profile.
          </p>
          <p className="mt-2 text-[9.5px] text-muted-foreground">
            Endpoint: <code className="font-mono">GET /api/v1/context/autofill-profile</code>
            {" "}with <code className="font-mono">Authorization: Bearer …</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
