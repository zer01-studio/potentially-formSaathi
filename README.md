# FormSaathi

FormSaathi helps people understand, fill, and check complex forms through a calm
conversation. Attach a form as a **web link, image (JPG/PNG/WEBP), or PDF**;
FormSaathi reads it, rewrites each question in plain language, takes answers by
typing or voice, checks them, and produces a completed form you can review and
download.

Built for students, people with low digital literacy, and anyone facing a
language barrier — with a **demo mode** that keeps the core flow working when
external AI or voice services are unavailable.

> **Status: Phase 1 of 6 complete.** Project setup, design foundation, mock
> auth, MongoDB layer, and the versioned API skeleton are in place. The form
> workspace (attach → extract → stepper → review) lands in Phase 2. See
> [Roadmap](#roadmap).

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
  FormSaathi runs that step in demo mode.
- Docs: <https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api>,
  <https://ai.google.dev/api/generate-content>

Phase 3 adds structured JSON output validation with a zod schema, retries once,
then falls back to the rule-based demo engine.

### ElevenLabs

- Text-to-speech: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Headers: `xi-api-key: <ELEVENLABS_API_KEY>`, `Content-Type: application/json`
- Body: `{ "text": "...", "model_id": "eleven_multilingual_v2" }` — responds
  with audio (default `mp3_44100_128`)
- The docs do not prescribe a default voice. **Rachel** (`21m00Tcm4TlvDq8ikWAM`)
  is the long-standing documented example voice and a good default; the voice is
  always taken from `ELEVENLABS_VOICE_ID`. Confirm the ID against your account
  with `GET https://api.elevenlabs.io/v1/voices` once a key exists.
- Docs: <https://elevenlabs.io/docs/api-reference/text-to-speech/convert>

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
│ Landing · Sign in/up · Workspace placeholder · light/dark theme       │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ fetch /api/v1/* (same-origin)
                               │ cookie session + X-CSRF-Token header
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│ Next.js Route Handlers (Node runtime)                                 │
│                                                                       │
│  withApi() wrapper — the only way into the API:                       │
│    apiVersion envelope · zod parsing · CORS allow-list · CSRF         │
│    session or bearer auth · scope checks · per-IP rate limits         │
│                                                                       │
│  AuthProvider interface ── MockCredentialsProvider (bcrypt)           │
│                          └ GoogleOAuthProvider (stub, TODO)           │
│                                                                       │
│  Service layer (Phases 2–4): extraction · validation · Gemma ·        │
│  ElevenLabs · OCR — every external call has a demo fallback           │
│                                                                       │
│  Cache interface (Phase 3): in-memory LRU (Redis later)               │
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
- **API clients (future extension):** `Authorization: Bearer …` tokens stored
  hashed in `apiTokens` with `scopes`, `expiresAt`, `lastUsedAt`, `revokedAt`.
  Token requests skip CSRF; cookie requests must send `X-CSRF-Token`.
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
| `RATE_LIMIT_PER_MINUTE` | No | `20` | Sliding-window limit for AI/upload endpoints (Phases 2–3). |
| `DAILY_AI_BUDGET_PER_USER` | No | `100` | Per-user daily AI call budget (Phase 3). |
| `MAX_UPLOAD_MB` | No | `10` | Upload size limit (Phase 2). |
| `MAX_PDF_PAGES` | No | `20` | PDF page limit (Phase 2). |
| `CACHE_DRIVER` | No | `memory` | Only `memory` today; Redis deliberately not added. |
| `EXTENSION_ALLOWED_ORIGINS` | No | — | Comma-separated origins allowed to call `/api/v1/*` cross-origin. Empty → same-origin only. |

Secrets are read only in server modules (`src/lib/env.ts` imports
`server-only`), and no secret is exposed to the browser bundle.

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
- The workspace shows a **visible banner naming the unavailable services** (see
  `src/components/workspace/demo-banner.tsx`).
- `AI_ENABLED=false` is a hard kill switch: all AI calls are skipped.

In Phase 1 the availability detection and banner are live; the extraction and AI
pipelines themselves arrive in Phases 2–4. The health endpoint reports the same
status: `GET /api/v1/health`.

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
| GET | `/api/v1/health` | public | Service/database availability. |
| POST | `/api/v1/auth/signup` | public | Email + password; sets session cookie. Rate-limited per IP. |
| POST | `/api/v1/auth/login` | public | Email + password; sets session cookie. Rate-limited per IP. |
| POST | `/api/v1/auth/logout` | session/token | Deletes the session; CSRF required for cookie sessions. |
| GET | `/api/v1/auth/session` | optional | Returns the current user or `null`. |

Planned (see `docs/extension-api.md` for the full contract): forms, answers,
context items, autofill profile, and API token management.

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
- **Uploads (Phase 2):** magic-byte checks, size/page limits, sanitized names,
  storage outside `public/`, deletion after processing. URL fetching gets SSRF
  protection (private/link-local/metadata ranges, redirect and timeout limits).
- **Not yet built:** real OAuth, browser extension, PDF output, template
  sharing. Mock auth is intentional for now.

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
| 2 | Attach · validation · extraction (demo first) · stepper · review | Next |
| 3 | Gemma integration with LRU cache + zod-validated output | Planned |
| 4 | Voice toggle · ElevenLabs with fallback · motion polish | Planned |
| 5 | Templates placeholder · Context Explorer · API tokens · autofillKey | Planned |
| 6 | Tests · security review · extension API docs · final README | Planned |

Further out: Google OAuth, template sharing, PDF output, Redis cache, browser
extension.
