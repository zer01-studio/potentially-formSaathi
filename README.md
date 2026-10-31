# FormSaathi

FormSaathi helps people understand, fill, and check complex forms through a calm
conversation. Attach a form as a **web link, image (JPG/PNG/WEBP), or PDF**;
FormSaathi reads it, rewrites each question in plain language, takes answers by
typing or voice, checks them, and produces a completed form you can review and
download.

Built for students, people with low digital literacy, and anyone facing a
language barrier — with a **demo mode** that keeps the core flow working when
external AI or voice services are unavailable.

> **Status: Phases 1–5 complete; Phase 6 (tests, security review, final docs) next.**
> Voice replies (ElevenLabs TTS/STT, greyed out without a key), optional AI notes,
> Templates placeholder, Context Explorer, answer memory/prefill, API tokens,
> and the scoped autofill-profile endpoint are all live.
> The AI now **reads the whole form in one pass** and groups related fields into as
> few steps as possible — never generating or guessing answers, only rewiring
> wording, labels, and grouping. Falls back to one-field-per-step when unavailable.
> The Vitest suite and final security review are Phase 6. See [Roadmap](#roadmap).

---

## Verified external services (checked 2026-10-30)

These were confirmed against official documentation before any integration code
was written. No model names or endpoints are guessed.

### Gemma API (Google)

Gemma models are served through the **Gemini API**.

- Base URL: `https://generativelanguage.googleapis.com`
- Endpoint: `POST /v1beta/models/{model}:generateContent`
- Current Gemma model IDs: `gemma-4-31b-it`, `gemma-4-26b-a4b-it`
- **Decision for this build:** use the faster `gemma-4-26b-a4b-it` as
  `GEMMA_MODEL` (the 31B variant remains a quality-first option).
- Auth: `x-goog-api-key: <GEMMA_API_KEY>` header
- Request body:

  ```json
  { "contents": [{ "parts": [{ "text": "..." }] }] }
  ```

- The model to use always comes from `GEMMA_MODEL`; if it (or the key) is empty,
  or `AI_ENABLED=false`, the step uses the rule-based demo engine.
- Docs: <https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api>,
  <https://ai.google.dev/api/generate-content>

**Phase 3 implementation (live):**

- Requests use `generationConfig.thinkingConfig.thinkingLevel = "minimal"`, the
  documented fast mode for Gemma 4 (the 26B variant can otherwise take longer than
  the request timeout). The 20s timeout was replaced with 60s.
- The rewrite + validation-hint prompt wraps form text in explicit delimiters and
  instructs the model to treat it as untrusted data.
- Output is parsed as JSON and validated with zod. If it does not match, FormSaathi
  retries once; any remaining failure falls back to the deterministic rules.
  Transient Gemma `5xx` responses are retried once as well.
- Results are cached by normalized question text + model + prompt version
  (`simplify-v1`) for 24 hours, so repeat forms avoid new AI calls.
- `DAILY_AI_BUDGET_PER_USER` is enforced in memory before AI work; on exhaustion
  or any failure the form is still created with rule-based questions.
- Forms store an `aiEnhanced` flag and the form header shows an “AI simplified”
  badge when any question was rewritten by Gemma or served from its cache.
- Logs record counts, cache hits/misses, and error codes only — never question
  text, answers, prompts, or model output.
- Question rewrites and validation hints are wired now. After transcription, a
  voice answer is placed in the current question as editable text, so the user
  can correct it before saving. Free-form conversational answers are not mapped
  automatically.

**Whole-form AI planning (live, Phase 5 update):**

- The AI reads **all fields in a single call** instead of rewriting them one by
  one. It groups related fields into as few steps as possible, assigns a short
  \step\, \stepTitle\, and concise \label\ to each group.
- **No answers are generated or guessed** — Gemma only rewrites wording, labels,
  and grouping. Answer slots arrive empty.
- Groups are capped at 4 fields per step; a step with only one field uses the
  question itself as the step title (no label duplication).
- If the AI is unavailable, returns invalid output, or exhausts the daily budget,
  the form falls back silently to one-field-per-step — the user sees no error.
- Verified against \httpbin.org/forms/post\: **6 fields → 2 steps** — “Your
  contact details” (name, phone, email) and “Your order” (size, delivery time,
  instructions). \iEnhanced: true\, zero generated answers.

### ElevenLabs

- Text-to-speech: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Speech-to-text: `POST https://api.elevenlabs.io/v1/speech-to-text`,
  multipart with `file` and `model_id: "scribe_v2"` (verified).
- TTS headers: `xi-api-key: <ELEVENLABS_API_KEY>`, `Content-Type: application/json`
- TTS body: `{ "text": "...", "model_id": "eleven_multilingual_v2" }` — responds
  with audio (default `mp3_44100_128`).
- The docs do not prescribe a default voice. **Rachel** (`21m00Tcm4TlvDq8ikWAM`)
  is the long-standing documented example voice and a good default; the voice is
  always taken from `ELEVENLABS_VOICE_ID`. Confirm the ID against your account
  with `GET https://api.elevenlabs.io/v1/voices` once a key exists.
- Docs: <https://elevenlabs.io/docs/api-reference/text-to-speech/convert>,
  <https://elevenlabs.io/docs/api-reference/speech-to-text/convert>
- **Live audio was not exercised in this environment because no ElevenLabs key
  is configured.** The UI keeps the voice toggle visible but disabled/greyed, the
  API returns a plain-language 503 fallback, and text remains fully usable. TTS
  audio is cached in memory by text + voice + model; STT recordings are processed
  in memory and never stored.

### Mongoose + Next.js compatibility

- Next.js **16.4.3** (Node ≥ 20.9), Mongoose **9.11.4** (Node ≥ 20.19).
  Local runtime used for development: Node 22.
- The official Mongoose Next.js guide notes that Mongoose requires the **Node.js
  runtime** (not Edge) and recommends caching the connection plus
  `mongoose.models.X || mongoose.model(...)` for hot reload. Both patterns are
  used here (`src/lib/db/connect.ts`, `src/lib/db/models/*`).
- Docs: <https://mongoosejs.com/docs/nextjs.html>

### OCR — decided

**Local Tesseract.js** (`tesseract.js`). It runs inside the Node runtime, needs
no third-party key, and downloads the English language data once, caching it
locally. Set `OCR_PROVIDER=tesseract` to enable it; leave it empty to exercise
the demo extraction path. It is used for image uploads and scanned PDF pages
after the PDF text layer comes back empty.

---

## Text architecture diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│ Browser — React 19 + Next.js App Router · Tailwind v4 · Motion        │
│ Landing · Sign in/up · Workspace (forms · templates · context)        │
│ light/dark theme · optional voice mode                                │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ fetch /api/v1/* (same-origin)
                               │ cookie session + X-CSRF-Token header
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Next.js Route Handlers (Node runtime)                                 │
│                                                                       │
│  withApi() wrapper — the only way into the API:                       │
│    apiVersion envelope · zod parsing · CORS allow-list · CSRF         │
│    session or bearer auth · scope checks · per-IP/user rate limits    │
│                                                                       │
│  AuthProvider interface ── MockCredentialsProvider (bcrypt)           │
│                          └ GoogleOAuthProvider (stub, TODO)           │
│                                                                       │
│  Extraction (live): SSRF-guarded HTML · pdfjs text layer ·            │
│  pdf-to-img rendering · local Tesseract.js OCR · SHA-256 LRU cache    │
│                                                                       │
│  Gemma (optional): plain-language rewrites · validation hints ·       │
│  AI notes · cache · daily budget · rule-based fallback                │
│                                                                       │
│  Context: safe answer memory · prefill · scoped autofill profile      │
│  API tokens: hashed · scopes · expiry · revocation · audit            │
│                                                                       │
│  Voice (optional): ElevenLabs TTS/STT · greyed out without a key      │
│                                                                       │
│  Cache interface (live for extraction/AI): in-memory LRU (Redis later)│
└──────────────────────────────┬────────────────────────────────────────┘
                               │ Mongoose (cached connection)
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│ MongoDB Atlas                                                         │
│ users · sessions (TTL) · apiTokens · forms · answers · contextItems   │
│ templates                                                             │
└───────────────────────────────────────────────────────────────────────┘

proxy.ts (Next.js Proxy): issues the CSRF cookie · answers /api/v1 CORS
preflights · keeps disallowed cross-origin callers out.
```

### Security model at a glance

- **Web app:** opaque session token in an `httpOnly`, `SameSite=Lax`, `Secure`
  (in production) cookie; only a SHA-256 hash is stored in `sessions`, which has
  a TTL index on `expiresAt`.
- **API clients / browser extension:** `Authorization: Bearer fs_…` tokens
  (SHA-256 hashed at rest) with `scopes`, `expiresAt` (90 days), `lastUsedAt`,
  and `revokedAt`. Token requests skip CSRF; cookie requests must send
  `X-CSRF-Token`. The raw token is shown once at issue time.
- **Passwords:** bcrypt (bcryptjs) with 12 rounds. No plaintext anywhere.

---

## Setup

### Prerequisites

- Node.js **20.19+** (Next.js 16 + Mongoose 9 requirement)
- A MongoDB database. **MongoDB Atlas** is the intended production setup.

### 1. Install

```bash
npm install
```

### 2. Environment

Copy the template and fill in your own values. **Never commit `.env.local`.**

```bash
cp .env.example .env.local
```

Minimum to run auth: `MONGODB_URI` (for Atlas, include the database name before
the query string, e.g. `...mongodb.net/formsaathi?retryWrites=true&w=majority`).
Leave AI/voice keys empty to run in demo mode; the app still starts.

Decided values for this build (set in your own `.env.local`):

```
GEMMA_MODEL=gemma-4-26b-a4b-it
OCR_PROVIDER=tesseract
```

If you create `.env.local` yourself, note that Next.js loads it automatically in
development and production.

#### Local database without Atlas (optional)

```bash
npm run db:dev
# In another terminal:
MONGODB_URI=mongodb://127.0.0.1:27017/formsaathi npm run dev
```

`db:dev` downloads a MongoDB binary on first run into `./.data` (git-ignored) and
keeps data between restarts. It runs as a standalone server, so Mongo
**transactions are unavailable**; Atlas (replica set) is required for flows that
use transactions (e.g. account deletion, Phase 5/6).

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>, create a mock account, and you will land in
`/workspace`.

#### Testing from another device on your network

`next dev` only accepts cross-origin dev assets from explicitly allowed hosts.
`next.config.ts` adds `localhost`, `127.0.0.1`, and every IPv4 address of the
machine to `allowedDevOrigins`, so `http://<your-lan-ip>:3000` works without
extra configuration. To use a fixed public IP or hostname, add it to
`allowedDevOrigins` in `next.config.ts`.

Two production notes: cookies are `Secure` when `NODE_ENV=production`, so serve
the app over **HTTPS** outside localhost; and the API derives its origin from the
`Host` / `X-Forwarded-Host` headers, so a reverse proxy must forward them
unchanged.

### 4. Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Environment variables

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes (auth/data) | — | MongoDB Atlas connection string. App starts without it; auth returns a friendly 503. |
| `GEMMA_API_KEY` | No | — | Gemini API key for Gemma. Empty → demo mode for AI steps. |
| `GEMMA_MODEL` | No | — | Gemma model ID. Use `gemma-4-26b-a4b-it` (fast, chosen) or `gemma-4-31b-it` (quality). Empty → demo mode. |
| `ELEVENLABS_API_KEY` | No | — | ElevenLabs key. Empty → text-only fallback. |
| `ELEVENLABS_VOICE_ID` | No | — | Voice for TTS (e.g. Rachel `21m00Tcm4TlvDq8ikWAM`). |
| `OCR_PROVIDER` | No | — | Set to `tesseract` for local Tesseract.js OCR. Empty → demo extraction. |
| `AUTH_MODE` | No | `mock` | Only `mock` is supported now. Google OAuth is a stub. |
| `SESSION_SECRET` | No | — | Reserved for session-related signing; opaque session tokens are hashed today. |
| `AI_ENABLED` | No | `true` | Kill switch. `false` → every AI step uses demo mode. |
| `RATE_LIMIT_PER_MINUTE` | No | `20` | Sliding-window limit for form upload/attach endpoints (which may call AI). |
| `DAILY_AI_BUDGET_PER_USER` | No | `100` | Per-user daily AI operation budget; exhaustion falls back to rules for the rest of the day. |
| `MAX_UPLOAD_MB` | No | `10` | Upload size limit. |
| `MAX_PDF_PAGES` | No | `20` | PDF page limit. |
| `CACHE_DRIVER` | No | `memory` | Only `memory` today; Redis deliberately not added. |
| `EXTENSION_ALLOWED_ORIGINS` | No | — | Comma-separated origins allowed to call `/api/v1/*` cross-origin. Empty → same-origin only. |

Secrets are read only in server modules (`src/lib/env.ts` imports
`server-only`), and no secret is exposed to the browser bundle.

Optional, not present in `.env.example` (to keep that template to the specified
keys): `UPLOAD_RETENTION_MINUTES` — uploads are deleted immediately after
processing by default (`0`); set a positive number of minutes to keep them
longer.

---

## Demo mode

FormSaathi is designed so that **the core flow always works**:

- Services are considered available only when fully configured —
  Gemma needs `AI_ENABLED=true`, `GEMMA_API_KEY`, and `GEMMA_MODEL`;
  voice needs both ElevenLabs values; OCR needs `OCR_PROVIDER=tesseract`
  (local OCR, no external key).
- When a service is unavailable, that step switches to a local fallback:
  rule-based question simplification and validation, bundled sample forms, and
  text-only replies.
- If local OCR is disabled or the OCR engine fails, image/scanned-PDF uploads
  still create a form using a bundled sample, with a clear on-screen note; the
  stepper, checks, review, and JSON export stay usable.
- If OCR **succeeds but finds no recognizable form questions** (for example, a
  screenshot of a login screen), the upload is now rejected with a plain-language
  error instead of silently creating a sample form. Try a clearer crop or the
  original PDF.
- The workspace shows a **visible banner naming the unavailable services** (see
  `src/components/workspace/demo-banner.tsx`).
- If ElevenLabs isn’t configured, the **Voice replies** toggle and the form’s
  play/mic controls stay visible but greyed out; no voice calls are attempted.
  If a key exists, the toggle is saved per user and questions/confirmations can be
  read aloud and answers recorded.
- `AI_ENABLED=false` is a hard kill switch: all AI calls are skipped.

Health status wording is deliberate: `active` means the integration is enabled
(credentials present), `ready` means the local OCR engine is enabled,
`connected` is used only for the database (which is probed), and `demo` means the
fallback is active. The health endpoint reports the same status at
`GET /api/v1/health`.

### Answer memory and context

- Each form can carry optional **notes for the assistant** at creation (max
  1,000 characters). They are stored with the form, shown on the form page, and
  passed to Gemma as untrusted context to reduce misunderstandings.
- **Context saving** is on by default in this preview and can be switched off in
  the Context Explorer. Only recognisable, low-risk details are saved from
  answers (name, email, phone, address, city/state/PIN/country, birth date,
  company, website). Free-text answers are never auto-saved.
- Saved details prefill matching questions in later forms; a “Prefilled from your
  saved context” hint asks the user to check before saving.
- Items are private to FormSaathi unless marked **Share for autofill**. Only
  items with an `autofillKey` appear in the extension’s autofill-profile endpoint.
- API tokens can be issued/revoked from the Context Explorer, and the scoped
  autofill profile is audited without logging field values.

### How extraction works today

- **Link:** the URL is validated (http/https, standard ports, no credentials),
  DNS-resolved and checked against private/loopback/link-local/metadata ranges
  before every hop (max 3 redirects, 10s timeout, 2 MB HTML cap). Form controls
  are parsed from the HTML, including labels, `required`, selects, and radio
  groups.
- **PDF:** the text layer is read first (pdfjs) — page count is enforced before
  processing. If a PDF has no meaningful text, pages are rendered (pdf-to-img +
  `@napi-rs/canvas`) and OCR’d locally with Tesseract.js.
- **Image:** local Tesseract.js OCR.
- **Simplification:** Gemma rewrites questions and suggests validation hints when
  configured (Phase 3); otherwise rule-based dictionary/mapping heuristics are
  used. The original wording is always preserved and available in the stepper.
- **Screenshot/scan cleanup:** OCR/PDF lines that are legal text, navigation,
  marketing copy, buttons, or help fragments are ignored. Label+placeholder pairs
  such as “Email” / “Enter your email” are merged into one field. Password,
  payment, and other secret fields are deliberately never extracted.
- **Copy answers:** the confirmation step and review list show each saved answer
  in a copyable code block with a Copy button, ready to paste into the original
  form.
- **Paste a screenshot:** the attach panel accepts images/PDFs pasted from the
  clipboard with Ctrl+V (or “Paste from clipboard”) and switches to the matching
  Photo/PDF tab.
- **Caching:** extraction results are cached by the SHA-256 hash of the file or
  fetched HTML in the in-memory LRU (`src/lib/extraction/cache.ts`), so
  re-attaching the same form is instant. Hits/misses are logged server-side.
- **Storage:** uploads are written with random names under `uploads/` (outside
  `public/`), never the original filename, and deleted after processing
  (optional retention above).

---

## API v1 (same routes the UI uses)

Every UI feature goes through versioned JSON routes under `/api/v1/*`; there is
no UI-only logic. Every JSON response includes `apiVersion: "v1"`.

```json
{
  "apiVersion": "v1",
  "ok": true,
  "data": { "user": { "id": "…", "email": "you@example.com" } }
}
```

```json
{
  "apiVersion": "v1",
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Please check the highlighted fields and try again.",
    "details": { "fieldErrors": { "email": "That email address doesn't look right." } }
  }
}
```

Live now:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | public | Service configuration/database status. Values: `active`, `ready`, `connected`, `demo`, `unavailable`. |
| POST | `/api/v1/auth/signup` | public | Email + password; sets session cookie. Rate-limited per IP. |
| POST | `/api/v1/auth/login` | public | Email + password; sets session cookie. Rate-limited per IP. |
| POST | `/api/v1/auth/logout` | session/token | Deletes the session; CSRF required for cookie sessions. |
| GET | `/api/v1/auth/session` | optional | Returns the current user or `null`. |
| POST | `/api/v1/forms/from-url` | session | Reads a public web form into fields; accepts optional `instructions` for the assistant. Rate-limited per IP and user. |
| POST | `/api/v1/forms/from-file` | session | Multipart PDF/image upload with optional `instructions`; magic-byte, size, and page checks. Rate-limited per IP and user. |
| GET | `/api/v1/forms` | session or `forms:read` token | Lists the user’s forms with answer progress. |
| GET | `/api/v1/forms/{id}` | session or `forms:read` token | Form detail: fields, answers, AI notes, prefilled suggestions, extraction mode, demo note. |
| PATCH | `/api/v1/forms/{id}/answers/{fieldKey}` | session | Saves and validates one answer; feeds safe details into context. CSRF required. |
| GET | `/api/v1/forms/{id}/export` | session or `forms:read` token | Validates all answers and downloads the structured JSON file. |
| GET | `/api/v1/preferences` | session or token | Voice and context preferences plus voice availability. |
| PATCH | `/api/v1/preferences` | session | Updates `voiceRepliesEnabled` and/or `contextSavingEnabled`. |
| GET | `/api/v1/context/items` | session or `context:read` token | Saved context items and the saving preference. |
| POST | `/api/v1/context/items` | session or `context:write` token | Add a saved detail. |
| PATCH | `/api/v1/context/items/{id}` | session or `context:write` token | Edit a saved detail, including its `autofillKey`. |
| DELETE | `/api/v1/context/items/{id}` | session or `context:write` token | Delete one detail. |
| DELETE | `/api/v1/context/items` | session or `context:write` token | Clear all details. |
| GET | `/api/v1/context/autofill-profile` | `autofill:read` token or session | Flat map of shared details only; per-token rate limit and audit. |
| GET | `/api/v1/tokens` | session | List issued API tokens (metadata only). |
| POST | `/api/v1/tokens` | session | Issue a token; raw value shown once. |
| DELETE | `/api/v1/tokens/{id}` | session | Revoke a token. |
| POST | `/api/v1/voice/speak` | session | ElevenLabs TTS with cache; 503 when unconfigured. |
| POST | `/api/v1/voice/transcribe` | session | ElevenLabs STT (scribe_v2); 503 when unconfigured. |

Bearer tokens are read-only for forms: they can list, read, and export, but
cannot create forms or change answers. Creating and revoking tokens requires a
web session. Context items, the autofill profile, and voice endpoints are live;
`docs/extension-api.md` is the full contract for API clients.

**CORS/CSRF rules**

- Only origins in `EXTENSION_ALLOWED_ORIGINS` may call `/api/v1/*` cross-origin;
  preflights are answered by `src/proxy.ts`. Everything else is same-origin only.
- Cookie-authenticated state-changing requests require `X-CSRF-Token` to match
  the `fs_csrf` cookie (double-submit, timing-safe compare).
- Bearer-token requests skip CSRF (no ambient cookie is used) and are checked
  against scopes instead.

---

## Security notes

- **Headers:** CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`, and a restrictive `Permissions-Policy` are set in
  `next.config.ts` for all routes.
- **CSP trade-off:** `script-src`/`style-src` allow `'unsafe-inline'` because the
  theme bootstrap script and Next.js inline styles require it. Moving to a
  nonce-based policy (dynamic rendering + proxy nonce) is a future hardening
  step.
- **No PII in logs:** API request logs contain method, route, status, duration,
  and auth kind only. Errors are redacted (MongoDB URIs, bearer tokens). No form
  text, answers, emails, or IPs are logged; rate-limit buckets use hashed IPs.
- **Rate limiting is in-memory** (per process). For multi-instance deployments,
  swap the `RateLimiter` implementation for Redis-backed storage.
- **Transactions** (account/context deletion) require a MongoDB replica set —
  Atlas provides one by default; the optional local memory server does not.
- **Uploads:** magic-byte type detection (never extension-only), size and PDF
  page limits, random on-disk names under `uploads/` (outside `public/`),
  deletion after processing, and no original filename stored on disk.
- **URL fetching:** DNS resolution plus private/loopback/link-local/CGNAT/
  metadata/metadata-adjacent blocking, re-checked after each redirect (max 3),
  standard ports only, 10s timeout, content-type check, 2 MB body cap. Residual
  risk: DNS rebinding between resolution and fetch (documented limitation; pin
  the resolved IP with a custom dispatcher if this becomes a hard requirement).
- **Form data:** answers are validated server-side on save and again on export;
  API logs never include form text or answers.
- **AI safety:** form text is untrusted; Gemma prompts use explicit delimiters and
  never execute instructions found in form text. AI output is zod-validated,
  bounded, and only used for display fields (question wording, help text,
  type/required hints). Prompts and model responses are never logged.
- **AI budget/rate limits:** daily AI usage is in-memory per user and per process;
  use shared storage if you run multiple instances. AI runs only through the
  attach endpoints that already have per-IP/per-user limits.
- **Voice:** ElevenLabs calls are made only when both `ELEVENLABS_API_KEY` and
  `ELEVENLABS_VOICE_ID` are set. Without them the voice toggle, play buttons,
  and mic are rendered disabled; the API returns a plain 503 and the UI falls
  back to typing. ElevenLabs request bodies are not logged and recordings are
  processed in memory only.
- **Tokens and autofill:** tokens are stored as SHA-256 hashes and shown once at
  creation; scope checks happen before data access. The autofill profile returns
  only items explicitly marked shareable, and reads are audited with counts and
  metadata only — never field values.
- **Not yet built:** real OAuth, browser extension, PDF output, template
  sharing. The voice integration is implemented but has not been exercised
  against the live ElevenLabs API in this environment (no key configured).

---

## Testing

Testing is **Phase 6** of the build plan and is not included in this phase.
Planned setup: **Vitest** for unit tests (validators, demo engine, rate limiter,
URL guard, upload checks, scope checks, autofill-profile filter) and integration
tests (upload → review in demo mode; a `forms:read` token rejected by the
autofill route). `npm test` will run the full suite once added.

---

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Setup, docs, design, mock auth, MongoDB, API skeleton, CORS | **Done** |
| 2 | Attach · validation · extraction · stepper · review · JSON export | **Done** |
| 3 | Gemma integration with cache, zod validation, budget, rule fallback | **Done** |
| 4 | Voice toggle · ElevenLabs TTS/STT · greyed fallback · motion polish | **Done** |
| 5 | Templates placeholder · Context Explorer · answer memory/prefill · API tokens · autofillKey | **Done** |
| 5’ | Whole-form AI planning · field grouping · fewer steps · no generated answers | **Done** |
| 6 | Tests · security review · extension API docs · final README | Next |

Further out: Google OAuth, template sharing, PDF output, Redis cache, browser
extension.
