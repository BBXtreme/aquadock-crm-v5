# Sales partner applications (Vertriebspartner-Bewerbungen)

**Last updated:** May 27, 2026

Website applicants on **aquadock.eu** submit sales-partner applications to the CRM via public API routes. Admins review them in **`/admin/partner-applications`**. This is separate from the authenticated **partner portal** (`/partner/login`, role `partner`) — applications are inbound leads, not CRM users.

Related: [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) (table + Storage bucket), [`architecture.md`](architecture.md) (HTTP inventory), [`production-deploy.md`](production-deploy.md) (env vars).

## Routes and UI

| Surface | Path | Access |
| --- | --- | --- |
| Admin inbox | `/admin/partner-applications` | `requireAdmin()` via `(protected)/admin/layout.tsx` |
| Admin detail | `/admin/partner-applications/[id]` | Same |
| Public CV upload (preferred) | `POST /api/public/sales-partner-applications/upload` | CORS + rate limit; multipart `file` field |
| Public signed upload URL (legacy) | `POST /api/public/sales-partner-applications/upload-url` | CORS + rate limit; browser PUT to Supabase (Storage CORS can block) |
| Public submit | `POST /api/public/sales-partner-applications` | CORS + rate limit; no session |

**Navigation:** Admin sidebar / sub-nav / ⌘K — key `adminPartnerApplications` in `src/lib/constants/app-shell-navigation.ts`.

**Components:**

- `src/components/features/partner-applications/PartnerApplicationsInboxCard.tsx` — list (React Query → `listPartnerApplications`)
- `src/components/features/partner-applications/PartnerApplicationDetailCard.tsx` — detail + status/notes

**Server actions:** `src/lib/actions/partner-applications-admin.ts` (list, get, update status, CV signed URL).

## Data flow (website → CRM)

```text
1. aquadock.eu  POST /upload (multipart file)  → CRM stores in tmp/{uuid}/… + cvUploadToken
   (legacy: POST /upload-url → PUT to Supabase signed URL — often blocked by Storage CORS)
2. aquadock.eu  POST /sales-partner-applications  → Zod validate, verify token, insert row
4. CRM server   move tmp/… → applications/{applicationId}/…
5. CRM server   emails → applicant (confirmation) + admin (notification + deep link)
6. CRM server   in-app notification → every admin (`partner_application_received`)
7. Admin        /admin/partner-applications       → review, status, download CV
```

**Important:** Submit payloads use **`cvUploadToken`**, not a raw storage path. The token binds the tmp path server-side; paths are never trusted from the client.

## Database and Storage

- **Table:** `public.partner_applications` — RLS admin-only (`user_has_role('admin')`). Public writes use **service role** after API validation.
- **Bucket:** `partner-applications` (private, 5 MiB, PDF/DOC/DOCX). Paths: `tmp/…` then `applications/{id}/…`.
- **Migration:** `supabase/migrations/20260527120000_partner_applications.sql`
- **Zod:** `src/lib/validations/partner-application.ts`

### Application statuses

`new` → `reviewing` → `interview` → `approved` | `rejected` | `withdrawn`

Duplicate submissions from the same email are blocked for **30 days** while status is `new`, `reviewing`, or `interview`.

### CV rules (validation)

- **DACH** (`DE`, `AT`, `CH`): CV required + `handelsvertreterAck: true`
- **Other countries:** CV required when `yearsSalesExperience >= 1`
- Locales on submit: `de` | `en`

## Public API contract (for aquadock.eu)

Both routes require a browser **`Origin`** header on `POST` (allowed origins below). `OPTIONS` returns CORS preflight headers.

### 1. Upload CV (preferred — multipart proxy)

```http
POST /api/public/sales-partner-applications/upload
Content-Type: multipart/form-data
Origin: https://aquadock.eu

file: (binary, field name must be "file")
```

**Response (200):**

```json
{
  "ok": true,
  "cvUploadToken": "…",
  "expiresIn": 300
}
```

No direct browser call to Supabase Storage is required.

### 2. Upload CV (legacy — signed URL)

```http
POST /api/public/sales-partner-applications/upload-url
Content-Type: application/json
Origin: https://aquadock.eu

{
  "filename": "cv.pdf",
  "contentType": "application/pdf",
  "fileSize": 102400
}
```

**Response (200):**

```json
{
  "ok": true,
  "uploadUrl": "https://…",
  "cvUploadToken": "…",
  "expiresIn": 300
}
```

Client uploads the file with `PUT` to `uploadUrl` (may fail cross-origin due to Supabase Storage CORS — prefer **§1** above).

### 3. Submit application

```http
POST /api/public/sales-partner-applications
Content-Type: application/json
Origin: https://aquadock.eu

{
  "locale": "de",
  "firstName": "…",
  "lastName": "…",
  "email": "…",
  "phone": "…",
  "countryCode": "DE",
  "cityRegion": "…",
  "proposedTerritory": "…",
  "yearsSalesExperience": 5,
  "industryExperience": ["b2b_sales", "tourism"],
  "motivation": "…",
  "cvUploadToken": "…",
  "handelsvertreterAck": true,
  "gdprConsent": true
}
```

**Success (200):** `{ "ok": true, "applicationId": "uuid" }`

**Common errors:** `validation_error` (400), `cv_invalid` / `cv_not_uploaded` (400), `duplicate_application` (409), `rate_limited` (429), `origin_not_allowed` (403).

**Honeypot:** Optional field `hp` — if non-empty, returns `{ "ok": true }` without persisting.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Insert applications, Storage move/sign |
| `PARTNER_APPLICATION_CORS_ORIGINS` | No | Comma-separated allowed origins (default: aquadock.eu + localhost:3000) |
| `PARTNER_APPLICATION_NOTIFY_EMAIL` | No | Admin notification recipient (default: `info@aquadock.de`) |
| `PARTNER_APPLICATION_UPLOAD_SECRET` | No | HMAC secret for `cvUploadToken` (falls back to service role key) |
| `CRM_PUBLIC_URL` | No | Base URL in admin notification emails (default: `NEXT_PUBLIC_SITE_URL` or `https://crm.aquadock.eu`) |
| `NEXT_PUBLIC_SITE_URL` | No | Privacy links in applicant confirmation email |

Per-user SMTP from **Settings** is used for sending emails (`sendNotificationHtmlEmail`).

**In-app:** After a successful submit, every user with role **`admin`** in `user_roles` receives a `partner_application_received` notification (bell + `/notifications`). Deep link: `/admin/partner-applications/{id}`. Respects per-user email notification preferences via the standard in-app notification email path.

## Code layout

```text
src/app/api/public/sales-partner-applications/
  route.ts                    # submit
  upload-url/route.ts         # signed upload + token
src/lib/partner-applications/
  cors.ts                     # CORS allowlist
  upload-token.ts             # HMAC create/verify
  storage.ts                  # bucket paths, move, signed URLs
  persistence.ts              # insert, duplicate check
  confirmation-email.ts       # applicant email (de/en)
  admin-notification-email.ts # team email + deep link
  admin-in-app-notification.ts # in-app notify all admins
src/lib/validations/partner-application.ts
src/lib/actions/partner-applications-admin.ts
```

## Testing

See [`testing-strategy.md`](testing-strategy.md) § Sales partner applications. Vitest covers public routes (validation, CORS, honeypot, token/CV errors), upload-token crypto, and Zod business rules. Admin UI is covered indirectly via server-action mocks; no dedicated Playwright spec yet.

## What this module does *not* do

- Does **not** create CRM companies/contacts or partner auth users automatically.
- Does **not** appear in the partner portal (`/partner/dashboard`) — only in admin.
- Does **not** expose applicant data to non-admin CRM users (RLS + `requireAdmin()`).
