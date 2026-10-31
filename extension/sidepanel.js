"use strict";

const els = {};
const state = {
  config: { baseUrl: "http://localhost:3000", token: "" },
  page: null,
  fields: [],
  candidates: [],
  matches: [],
  decisions: {},
  answers: {},
  notes: [],
  mode: null,
  asking: null,
  asked: new Set(),
  interview: false,
  chat: [],
  busy: false,
  formsLoaded: false,
};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  void boot();
});

function cacheElements() {
  const ids = [
    "settingsPanel",
    "settingsToggle",
    "baseUrlInput",
    "tokenInput",
    "saveConfig",
    "clearConfig",
    "originHint",
    "connectView",
    "connectBtn",
    "appView",
    "pageTitle",
    "pageMeta",
    "scanBtn",
    "matchBtn",
    "sourceKind",
    "formSource",
    "formPicker",
    "jsonSource",
    "jsonInput",
    "loadJsonBtn",
    "profileSource",
    "loadProfileBtn",
    "sourceStatus",
    "notes",
    "reviewList",
    "chatLog",
    "chatForm",
    "chatInput",
    "chatHint",
    "applyBtn",
    "copyBtn",
  ];
  for (const id of ids) els[id] = document.getElementById(id);
}

function bindEvents() {
  els.settingsToggle.addEventListener("click", () => {
    const open = els.settingsPanel.hidden;
    els.settingsPanel.hidden = !open;
    els.settingsToggle.setAttribute("aria-expanded", String(open));
    if (open) els.baseUrlInput.focus();
  });

  els.connectBtn.addEventListener("click", () => {
    els.settingsPanel.hidden = false;
    els.settingsToggle.setAttribute("aria-expanded", "true");
    els.tokenInput.focus();
  });

  els.saveConfig.addEventListener("click", () => void saveConfig());
  els.clearConfig.addEventListener("click", () => void clearConfig());
  els.scanBtn.addEventListener("click", () => void scanPage());
  els.matchBtn.addEventListener("click", () => void findMatches());
  els.applyBtn.addEventListener("click", () => void applyToPage());
  els.copyBtn.addEventListener("click", () => void copyJson());
  els.sourceKind.addEventListener("change", () => void handleSourceChange());
  els.formPicker.addEventListener("change", () => void loadSelectedForm());
  els.loadJsonBtn.addEventListener("click", () => loadPastedJson());
  els.loadProfileBtn.addEventListener("click", () => void loadProfile());
  els.chatForm.addEventListener("submit", handleChatSubmit);
}

async function boot() {
  const stored = await chrome.storage.local.get(["fsBaseUrl", "fsToken"]);
  state.config.baseUrl = stored.fsBaseUrl || "http://localhost:3000";
  state.config.token = stored.fsToken || "";

  els.baseUrlInput.value = state.config.baseUrl;
  els.tokenInput.value = state.config.token;
  els.originHint.textContent = `This extension's origin is chrome-extension://${chrome.runtime.id}. If requests are blocked, add EXTENSION_ALLOWED_ORIGINS=chrome-extension://${chrome.runtime.id} to .env.local and restart FormSaathi.`;

  say("bot", "Open a page with a form, then press Scan page. Nothing is filled until you press Apply.");
  render();
}

function renderConnection() {
  const connected = Boolean(state.config.token);
  els.connectView.hidden = connected;
  els.appView.hidden = !connected;
}

async function saveConfig() {
  const baseUrl = els.baseUrlInput.value.trim() || "http://localhost:3000";
  const token = els.tokenInput.value.trim();
  state.config = { baseUrl: baseUrl.replace(/\/+$/, ""), token };
  await chrome.storage.local.set({ fsBaseUrl: state.config.baseUrl, fsToken: token });

  els.settingsPanel.hidden = true;
  els.settingsToggle.setAttribute("aria-expanded", "false");
  render();

  if (!token) return;
  try {
    const data = await api("/api/v1/auth/session");
    say("bot", data?.user?.email ? `Connected as ${data.user.email}.` : "Token didn't match a user. Check it in Context → Access tokens.");
  } catch (error) {
    say("bot", error.message, "note");
  }
}

async function clearConfig() {
  state.config = { baseUrl: "http://localhost:3000", token: "" };
  await chrome.storage.local.remove(["fsBaseUrl", "fsToken"]);
  els.baseUrlInput.value = state.config.baseUrl;
  els.tokenInput.value = "";
  render();
}

async function api(path, options = {}) {
  const base = state.config.baseUrl.replace(/\/+$/, "");
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${state.config.token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(`Couldn't reach ${base}. Check the URL, and allow chrome-extension://${chrome.runtime.id} in EXTENSION_ALLOWED_ORIGINS.`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const message = payload?.error?.message || `Request failed (${response.status}).`;
    const hint =
      payload?.error?.code === "origin_not_allowed"
        ? ` Add EXTENSION_ALLOWED_ORIGINS=chrome-extension://${chrome.runtime.id} to .env.local, then restart FormSaathi.`
        : "";
    throw new Error(message + hint);
  }
  return payload.data;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToPage(message) {
  const tab = await activeTab();
  if (!tab?.id) throw new Error("No active tab.");
  if (!/^https?:/i.test(tab.url || "")) {
    throw new Error("This page can't be filled. Open a normal http(s) page.");
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}

function setBusy(busy) {
  state.busy = busy;
  els.scanBtn.disabled = busy;
  els.matchBtn.disabled = busy || state.fields.length === 0;
  els.applyBtn.disabled = busy || acceptedValues().length === 0;
  els.scanBtn.textContent = busy ? "Working…" : "Scan page";
}

async function scanPage() {
  setBusy(true);
  try {
    const result = await sendToPage({ type: "fs:scan" });
    if (!result?.ok) throw new Error(result?.error || "Couldn't read this page.");

    state.page = { title: result.title, url: result.url };
    state.fields = result.fields || [];
    state.matches = [];
    state.decisions = {};
    state.answers = {};
    state.asking = null;
    state.asked = new Set();
    state.notes = [];
    state.mode = null;
    state.chat = [];

    render();
    say(
      "bot",
      state.fields.length
        ? `I found ${state.fields.length} fillable field${state.fields.length === 1 ? "" : "s"}. Choose where the answers come from, then press Find matches.`
        : "I couldn't find any fillable fields here. Try a page that has a real form, and reload it if the extension was just installed.",
    );
  } catch (error) {
    say("bot", error.message, "note");
  } finally {
    setBusy(false);
    render();
  }
}

function apiField(field) {
  return {
    id: String(field.id).slice(0, 80),
    label: String(field.label || "").slice(0, 200),
    name: field.name ? String(field.name).slice(0, 120) : undefined,
    inputType: field.inputType,
    required: Boolean(field.required),
    options:
      field.options && field.options.length
        ? field.options.slice(0, 30).map((option) => String(option).slice(0, 120))
        : undefined,
    helpText: field.helpText ? String(field.helpText).slice(0, 300) : undefined,
    autocomplete: field.autocomplete ? String(field.autocomplete).slice(0, 60) : undefined,
    placeholder: field.placeholder ? String(field.placeholder).slice(0, 160) : undefined,
  };
}

async function findMatches() {
  if (!state.page || state.fields.length === 0 || state.busy) return;
  setBusy(true);
  render();

  try {
    const data = await api("/api/v1/extension/assist", {
      method: "POST",
      body: {
        page: {
          url: state.page.url,
          title: state.page.title,
          fields: state.fields.map(apiField),
        },
        candidates: state.candidates,
      },
    });

    state.matches = data.matches || [];
    state.mode = data.mode;
    state.notes = data.notes || [];
    state.decisions = {};
    for (const match of state.matches) {
      state.decisions[match.fieldId] = match.status === "matched" ? "accept" : "skip";
    }

    render();
    const confident = state.matches.filter((match) => match.status === "matched").length;
    say(
      "bot",
      confident
        ? `${confident} field${confident === 1 ? "" : "s"} matched confidently. Review each value, then press Apply to page.`
        : "I couldn't match anything confidently. Let's go through the fields together.",
    );

    if (state.candidates.length === 0) startInterview();
  } catch (error) {
    say("bot", error.message, "note");
  } finally {
    setBusy(false);
    render();
  }
}

function matchFor(fieldId) {
  return state.matches.find((match) => match.fieldId === fieldId) || null;
}

function fieldById(fieldId) {
  return state.fields.find((field) => field.id === fieldId) || null;
}

function finalValue(fieldId) {
  return state.answers[fieldId] ?? matchFor(fieldId)?.value ?? null;
}

function isAccepted(fieldId) {
  return state.decisions[fieldId] === "accept";
}

function acceptedValues() {
  const values = [];
  for (const field of state.fields) {
    const value = finalValue(field.id);
    if (isAccepted(field.id) && value) values.push({ id: field.id, value });
  }
  return values;
}

function startInterview() {
  state.asked = new Set();
  state.asking = null;
  state.interview = true;
  askNext();
}

function askNext() {
  const next = state.fields.find((field) => {
    const match = matchFor(field.id);
    if (state.answers[field.id]) return false;
    if (isAccepted(field.id)) return false;
    if (state.asked.has(field.id)) return false;
    return !match || match.status !== "matched";
  });

  if (!next) {
    state.asking = null;
    state.interview = false;
    if (state.fields.some((field) => !finalValue(field.id))) {
      say("bot", "That's everything I can ask. Review the values, then press Apply to page.");
    } else {
      say("bot", "Every field has a value. Review them, then press Apply to page.");
    }
    render();
    return;
  }

  state.asked.add(next.id);
  state.asking = next.id;
  const match = matchFor(next.id);
  const label = next.label || next.name || "this field";
  const question = match?.question || `What should go in “${label}”?`;
  say("bot", next.helpText ? `${question}\n${next.helpText}` : question);
  render();
  els.chatInput.focus();
}

function handleChatSubmit(event) {
  event.preventDefault();
  const text = els.chatInput.value.trim();
  if (!text) return;
  els.chatInput.value = "";
  say("user", text);

  if (!state.asking) {
    say("bot", "Use “Answer in chat” on a field so I know where this belongs.");
    return;
  }

  state.answers[state.asking] = text;
  state.decisions[state.asking] = "accept";
  const wasInterview = state.interview;
  state.asking = null;
  render();
  if (wasInterview) askNext();
}

async function handleSourceChange() {
  const kind = els.sourceKind.value;
  state.candidates = [];
  els.sourceStatus.textContent = "";
  els.formSource.hidden = kind !== "form";
  els.jsonSource.hidden = kind !== "json";
  els.profileSource.hidden = kind !== "profile";

  if (kind === "form" && !state.formsLoaded) {
    await loadFormList();
  }
}

async function loadFormList() {
  els.formPicker.disabled = true;
  try {
    const data = await api("/api/v1/forms");
    state.formsLoaded = true;
    els.formPicker.textContent = "";
    els.formPicker.append(new Option("Choose a form…", ""));
    for (const form of data.forms || []) {
      els.formPicker.append(new Option(`${form.title} · ${form.answeredCount}/${form.fieldCount}`, form.id));
    }
    if (!data.forms || data.forms.length === 0) {
      els.sourceStatus.textContent = "No saved forms yet.";
    }
  } catch (error) {
    els.sourceStatus.textContent = `${error.message} (a token needs the forms:read scope)`;
  } finally {
    els.formPicker.disabled = false;
  }
}

async function loadSelectedForm() {
  const formId = els.formPicker.value;
  if (!formId) {
    state.candidates = [];
    els.sourceStatus.textContent = "";
    return;
  }

  els.sourceStatus.textContent = "Loading answers…";
  try {
    const data = await api(`/api/v1/forms/${formId}`);
    const detail = data.form;
    const candidates = [];
    for (const field of detail.fields || []) {
      const value = detail.answers?.[field.key];
      if (typeof value !== "string" || !value.trim()) continue;
      candidates.push({
        key: field.key,
        label: field.plainQuestion || field.question || field.key,
        value: value.trim(),
        type: field.type,
      });
    }
    setCandidates(candidates, detail.title);
  } catch (error) {
    els.sourceStatus.textContent = error.message;
  }
}

function loadPastedJson() {
  const raw = els.jsonInput.value.trim();
  if (!raw) {
    els.sourceStatus.textContent = "Paste JSON first.";
    return;
  }
  try {
    const candidates = candidatesFromJson(JSON.parse(raw));
    if (candidates.length === 0) {
      els.sourceStatus.textContent = "No string answers found in that JSON.";
      return;
    }
    setCandidates(candidates, "the pasted JSON");
  } catch {
    els.sourceStatus.textContent = "That doesn't look like valid JSON.";
  }
}

function candidatesFromJson(data) {
  const out = [];
  const seen = new Set();
  const push = (key, label, value, type) => {
    if (typeof value !== "string" || !value.trim()) return;
    const id = String(key || out.length).slice(0, 80);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      key: id,
      label: String(label || key || id).slice(0, 200),
      value: value.trim().slice(0, 2000),
      ...(type ? { type: String(type).slice(0, 40) } : {}),
    });
  };

  if (Array.isArray(data?.answers)) {
    for (const item of data.answers) {
      push(item.key ?? item.field ?? out.length, item.plainQuestion || item.question || item.field, item.value, item.type);
    }
  } else if (data?.answers && typeof data.answers === "object") {
    for (const [key, value] of Object.entries(data.answers)) push(key, key, value);
  } else if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) push(key, key, value);
  }

  return out.slice(0, 60);
}

async function loadProfile() {
  els.sourceStatus.textContent = "Loading profile…";
  try {
    const profile = await api("/api/v1/context/autofill-profile");
    const candidates = Object.entries(profile || {}).map(([key, value]) => ({
      key,
      label: humanize(key),
      value: String(value),
    }));
    if (candidates.length === 0) {
      els.sourceStatus.textContent = "No shareable details yet. Mark context items as shareable in FormSaathi.";
      return;
    }
    setCandidates(candidates, "your autofill profile");
  } catch (error) {
    els.sourceStatus.textContent = error.message;
  }
}

function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function setCandidates(candidates, sourceLabel) {
  state.candidates = candidates;
  els.sourceStatus.textContent = `${candidates.length} saved answer${candidates.length === 1 ? "" : "s"} ready from ${sourceLabel}. Press Find matches.`;
  render();
}

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function say(role, text, tone) {
  state.chat.push({ role, text, tone });
  renderChat();
}

function renderChat() {
  els.chatLog.textContent = "";
  for (const entry of state.chat) {
    const cls = entry.tone === "note" ? "bubble note" : `bubble ${entry.role}`;
    els.chatLog.append(h("div", { class: cls, text: entry.text }));
  }
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderNotes() {
  els.notes.textContent = "";
  const items = [];
  if (state.mode === "rules") items.push("Matched with local rules.");
  if (state.mode === "ai") items.push("Matched with Gemma.");
  for (const note of state.notes) items.push(note);

  if (items.length === 0) {
    els.notes.hidden = true;
    return;
  }
  els.notes.hidden = false;
  for (const item of items) els.notes.append(h("p", { text: item }));
}

function chip(text, extraClass) {
  return h("span", { class: `chip ${extraClass || ""}`.trim(), text });
}

function reviewRow(field) {
  const match = matchFor(field.id);
  const accepted = isAccepted(field.id);
  const value = finalValue(field.id);
  const row = h("div", { class: `review-row${accepted ? " is-accepted" : ""}` });

  const checkbox = h("input", {
    type: "checkbox",
    "aria-label": `Fill ${field.label || field.name || "this field"}`,
  });
  checkbox.checked = accepted;
  checkbox.addEventListener("change", () => {
    state.decisions[field.id] = checkbox.checked ? "accept" : "skip";
    render();
  });

  const chips = h("div", { class: "chips" },
    chip(field.inputType),
    field.required ? chip("Required", "required") : null,
    match ? chip(match.confidence, match.confidence) : null,
    field.currentValue ? chip("Already filled") : null,
  );

  row.append(
    h("div", { class: "review-head" },
      checkbox,
      h("div", { class: "review-label" },
        h("div", { text: field.label || field.name || "Untitled field" }),
        chips,
      ),
    ),
  );

  const valueNode = h("p", {
    class: `value${value ? "" : " empty-value"}`,
    text: value || "No value yet",
  });
  row.append(valueNode);

  if (match?.reason) row.append(h("p", { class: "reason", text: match.reason }));

  if (field.currentValue && accepted) {
    row.append(h("p", { class: "reason", text: "Applying will replace the value already on the page." }));
  }

  if (match?.status === "ambiguous") {
    const flag = h("div", { class: "flag" });
    flag.append(h("strong", { text: "Recheck this with the form author." }));
    flag.append(h("div", { text: "The page wording is vague, so I can't be sure this is the same question." }));
    row.append(flag);

    if (!field.helpText) {
      row.append(h("div", { class: "flag danger" },
        h("strong", { text: "This form doesn't explain the field." }),
        h("div", { text: "Ask the author what it expects. If you already know, tell me and I'll use your answer." }),
      ));
    }

    if (value) {
      const copyBtn = h("button", { class: "btn secondary mini", type: "button", text: "Copy most likely" });
      copyBtn.addEventListener("click", () => void copyText(value, "Most likely value copied."));
      row.append(h("div", { class: "flag" },
        h("strong", { text: "Most likely: " }),
        h("span", { text: value }),
        h("div", { class: "row-actions" }, copyBtn),
        h("div", { class: "reason", text: "AI can make mistakes. Check this with the form author before submitting." }),
      ));
    }
  }

  if (!match || match.status === "missing") {
    const question = match?.question || `What should go in “${field.label || field.name || "this field"}”?`;
    row.append(h("div", { class: "flag" },
      h("strong", { text: "No confident answer." }),
      h("div", { text: question }),
      match?.guidance ? h("div", { class: "reason", text: match.guidance }) : null,
    ));
  }

  const actions = h("div", { class: "row-actions" });

  if (value && match?.status !== "ambiguous") {
    const copy = h("button", { class: "btn ghost mini", type: "button", text: "Copy value" });
    copy.addEventListener("click", () => void copyText(value, "Value copied."));
    actions.append(copy);
  }

  if (match?.status !== "matched") {
    const ask = h("button", { class: "btn secondary mini", type: "button", text: "Answer in chat" });
    ask.addEventListener("click", () => {
      state.asked.delete(field.id);
      state.interview = false;
      state.asking = field.id;
      const question = match?.question || `What should go in “${field.label || field.name || "this field"}”?`;
      say("bot", question);
      render();
      els.chatInput.focus();
    });
    actions.append(ask);
  }

  if (actions.childElementCount > 0) row.append(actions);
  return row;
}

function renderReview() {
  els.reviewList.textContent = "";
  if (state.fields.length === 0 || state.matches.length === 0) {
    els.reviewList.hidden = true;
    return;
  }
  els.reviewList.hidden = false;
  for (const field of state.fields) {
    els.reviewList.append(reviewRow(field));
  }
}

function render() {
  renderConnection();

  els.pageTitle.textContent = state.page?.title || "No page scanned yet";
  els.pageMeta.textContent = state.page
    ? `${state.fields.length} field${state.fields.length === 1 ? "" : "s"} · ${state.page.url}`
    : "";

  els.matchBtn.disabled = state.busy || state.fields.length === 0;
  const acceptedCount = acceptedValues().length;
  els.applyBtn.disabled = state.busy || acceptedCount === 0;
  els.applyBtn.textContent =
    acceptedCount > 0
      ? `Apply ${acceptedCount} field${acceptedCount === 1 ? "" : "s"}`
      : "Apply to page";
  els.chatHint.textContent = state.asking ? "Answering the selected field" : "";

  renderNotes();
  renderReview();
  renderChat();
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    say("bot", message);
  } catch {
    say("bot", "Couldn't copy to the clipboard. Select the value manually.", "note");
  }
}

async function applyToPage() {
  const values = acceptedValues();
  if (values.length === 0) {
    say("bot", "Tick the fields you want to fill first.");
    return;
  }

  setBusy(true);
  try {
    const payload = Object.fromEntries(values.map((entry) => [entry.id, entry.value]));
    const result = await sendToPage({ type: "fs:fill", values: payload });
    const report = result?.report || [];
    const filled = report.filter((item) => item.status === "filled").length;
    const problems = report.filter((item) => item.status !== "filled");

    say("bot", `Filled ${filled} of ${values.length} fields. Nothing was submitted.`);
    if (problems.length > 0) {
      const detail = problems
        .map((item) => `${fieldById(item.id)?.label || item.id}: ${item.status}`)
        .join("; ");
      say("bot", `Some fields need a hand — ${detail}`, "note");
    }
  } catch (error) {
    say("bot", error.message, "note");
  } finally {
    setBusy(false);
    render();
  }
}

async function copyJson() {
  const answers = state.fields
    .map((field) => {
      const match = matchFor(field.id);
      const value = finalValue(field.id);
      return {
        field: field.label || field.name || field.id,
        id: field.id,
        inputType: field.inputType,
        value,
        source: state.answers[field.id] ? "chat" : match?.candidateKey ? "saved-answer" : null,
        confidence: match?.confidence || null,
      };
    })
    .filter((entry) => entry.value);

  const payload = {
    project: "FormSaathi",
    page: state.page,
    generatedAt: new Date().toISOString(),
    answers,
  };

  await copyText(JSON.stringify(payload, null, 2), "JSON copied to the clipboard.");
}
