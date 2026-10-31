# FormSaathi Extension API (v1)

This document is the contract for API clients — primarily the future browser
extension — that reuse the FormSaathi backend with **token authentication**.

> **Status:** fully live as of Phase 5. The API skeleton, envelope, CORS, scopes,
> CSRF rules, token resolution, forms read/attach, **token issuing/revoking,
> context items, and the autofill profile** are all implemented and tested.
> The extension itself and its sign-in flow (OAuth-style or pairing code) are out
> of scope.

---

## 1. Base URL and versioning

- Base path: `/api/v1`
- Every JSON response includes `"apiVersion": "v1"`.
- Response shape (success):

  ```json
  {
    "apiVersion": "v1",
    "ok": true,
    "data": {}
  }
  ```

- Response shape (error):

  ```json
  {
    "apiVersion": "v1",
    "ok": false,
    "error": {
      "code": "insufficient_scope",
      "message": "This access token doesn't have permission for that action.",
      "details": { "missingScopes": ["autofill:read"] }
    }
  }
  ```

- `Cache-Control: no-store` is set on API responses (personal data).

Common error codes: `auth_required`, `invalid_credentials`, `csrf_failed`,
`insufficient_scope`, `origin_not_allowed`, `rate_limited`,
`validation_failed`, `database_unavailable`, `not_found`, `no_form_questions`,
`internal_error`.

Unknown `/api/v1/...` paths return this error envelope (not HTML), so clients
can always parse the response.

---

## 2. Authentication

### Bearer tokens

```http
Authorization: Bearer fs_<token>
```

- Tokens are created in the app’s **Context Explorer**, not by the
  extension.
- The raw token is shown **once** when issued. Only a SHA-256 hash is stored in
  the `apiTokens` collection, alongside `userId`, `name`, `scopes`, `createdAt`,
  `lastUsedAt`, `expiresAt`, and `revokedAt`.
- Every request checks: token hash exists, `revokedAt` is null, and
  `expiresAt` is in the future. `lastUsedAt` is updated on use.
- Tokens can be revoked at any time; revoked tokens fail with `auth_required`.

Token-authenticated requests **do not use cookies** and therefore **skip CSRF**.
Cookie-authenticated requests always require CSRF (see §4).

### Scopes

| Scope | Grants |
| --- | --- |
| `context:read` | Read your own saved context items (value, category, source, timestamps). |
| `context:write` | Create, edit, and delete your own context items. |
| `forms:read` | Read forms and answers you created. |
| `autofill:read` | Read the reduced autofill profile (only items explicitly marked shareable). |

Rules:

- Every route declares required scopes; missing scopes return
  `403 insufficient_scope` with a `missingScopes` list.
- Requesting more files/fields than your scopes allow is never possible — the
  server filters data by scope *and* by the user’s `autofillKey` choices.
- Tokens are scoped to a single user (`userId`); there is no cross-user access.

---

## 3. CORS

- Only origins listed in `EXTENSION_ALLOWED_ORIGINS` (comma-separated, exact
  scheme + host + port, no trailing slash) may call `/api/v1/*` cross-origin.
- Same-origin requests are always allowed.
- Preflight (`OPTIONS /api/v1/...`) is answered centrally:

  ```http
  Access-Control-Allow-Origin: <allowed origin>
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
  Access-Control-Allow-Headers: Authorization,Content-Type,X-CSRF-Token
  Access-Control-Max-Age: 600
  Vary: Origin
  ```

- Requests from other origins receive `403 origin_not_allowed` and no CORS
  headers. There is no wildcard.
- Configure in `.env.local`:

  ```
  EXTENSION_ALLOWED_ORIGINS=chrome-extension://abcdefghijklmnop,https://app.example.com
  ```

  (A Chrome extension origin is `chrome-extension://<extension-id>`.)

---

## 4. CSRF rule (documented contract)

| Auth type | CSRF required? |
| --- | --- |
| `Authorization: Bearer …` (extension / API client) | **No.** No ambient browser credentials are used. |
| Session cookie (`fs_session`) from the web app | **Yes, for every non-GET request.** Send `X-CSRF-Token` equal to the `fs_csrf` cookie (double-submit, timing-safe comparison). |

If a cookie-session request omits or mismatches the header, the API returns
`403 csrf_failed` and the session is not modified. The web app’s fetch helper
(`src/lib/client/api.ts`) attaches the header automatically.

---

## 5. Endpoints

### Live now

| Method | Path | Auth | Scopes | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/health` | public | — | Service configuration/database status. `active`/`ready` report enabled integrations, not live third-party uptime; `connected` is the database probe. |
| GET | `/api/v1/auth/session` | optional | — | Current user, or `{ "user": null }`. Works with a bearer token or cookie session. |
| POST | `/api/v1/auth/logout` | optional | — | Revokes the cookie session. Bearer clients simply discard their token. |
| GET | `/api/v1/forms` | required | `forms:read` | List the user’s forms with answer progress. |
| GET | `/api/v1/forms/{id}` | required | `forms:read` | Form fields, answers, extraction mode, `aiEnhanced` flag, and demo note. |
| GET | `/api/v1/forms/{id}/export` | required | `forms:read` | Validated, structured JSON download (includes `apiVersion`). |
| POST | `/api/v1/forms/from-url` | **web session only** | — | Attach a public link; rate-limited per IP and user. |
| POST | `/api/v1/forms/from-file` | **web session only** | — | Multipart PDF/image upload with magic-byte, size, and page checks. |
| PATCH | `/api/v1/forms/{id}/answers/{fieldKey}` | **web session only** | — | Save and validate one answer (CSRF required). |

Bearer tokens are **read-only for forms**: they can list, read, and export, but
cannot create forms or change answers. Context items and the autofill profile
are the read paths intended for the extension.

### Also live (Phase 5)

| Method | Path | Auth | Scopes | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/context/items` | required | `context:read` | List context items with category, source, timestamps, and `autofillKey` (if set). |
| POST | `/api/v1/context/items` | required | `context:write` | Add a manually-created item. |
| PATCH | `/api/v1/context/items/{id}` | required | `context:write` | Edit value/category/`autofillKey`. |
| DELETE | `/api/v1/context/items/{id}` | required | `context:write` | Delete one item. |
| DELETE | `/api/v1/context/items` | required | `context:write` | Clear all items for the user. |
| POST | `/api/v1/tokens` | required (web session) | — | Issue a token for the extension. Returns the raw token once. |
| DELETE | `/api/v1/tokens/{id}` | required | — | Revoke a token (sets `revokedAt`). |
| GET | `/api/v1/context/autofill-profile` | required | `autofill:read` | **See §6 — the extension’s main read path.** |

---

## 6. Autofill profile

```http
GET /api/v1/context/autofill-profile
Authorization: Bearer fs_<token>
```

Returns a **flat, typed JSON map** of only the fields the caller may autofill.

- Requires the `autofill:read` scope.
- Returns **only** context items that (a) belong to the token’s user and
  (b) have a non-empty `autofillKey`. Items without an `autofillKey` are
  **never** returned — not even as empty values.
- The user controls `autofillKey` per item in the Context Explorer, and can
  switch context saving off entirely.
- Response `data` is the profile map itself (not nested), so extensions can
  consume it directly:

  ```json
  {
    "apiVersion": "v1",
    "ok": true,
    "data": {
      "fullName": "Asha Patil",
      "email": "asha@example.com",
      "phone": "+91 98765 43210",
      "dateOfBirth": "1996-03-12"
    }
  }
  ```

- Known autofill keys include `fullName`, `email`, `phone`, `dateOfBirth`;
  additional camelCase keys may appear as users label more items. Unknown keys
  should be ignored by clients.
- The response contains **no metadata** (no sources, timestamps, or item IDs).

### Rate limits and audit

- Each token is rate-limited (default: 60 requests/minute per token). Exceeding
  it returns `429 rate_limited` with a `Retry-After` header (seconds).
- Every autofill-profile read is logged as an audit event containing:
  token id, timestamp, scopes used, and **number of fields returned**.
  Field **values** are never logged.
- The API response and server logs never include raw context values in errors.

---

## 7. Example requests

### cURL

```bash
curl -s https://formsaathi.example.com/api/v1/context/autofill-profile \
  -H "Authorization: Bearer fs_YOUR_TOKEN"
```

### Browser extension (MV3 service worker)

```js
const response = await fetch(
  "https://formsaathi.example.com/api/v1/context/autofill-profile",
  {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit", // no cookies → CSRF not applicable
  }
);

const body = await response.json();
if (!body.ok) throw new Error(body.error.message);

const { fullName, email, phone, dateOfBirth } = body.data;
```

### Listing context

```bash
curl -s https://formsaathi.example.com/api/v1/context/items \
  -H "Authorization: Bearer fs_YOUR_TOKEN"
```

### Revoking a token

```bash
curl -s -X DELETE https://formsaathi.example.com/api/v1/tokens/<tokenId> \
  -H "Authorization: Bearer fs_YOUR_TOKEN"
```

---

## 8. What is intentionally out of scope

- The browser extension itself (UI, content scripts, form detection).
- Extension sign-in (OAuth-style redirect or pairing code). Until then, tokens
  are issued from the web app.
- Cookie-based cross-origin calls from the extension. Use bearer tokens;
  cookie requests remain same-origin and CSRF-protected.
- Field-value auditing. Only counts and metadata are recorded.
