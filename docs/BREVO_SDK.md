# Brevo (Sendinblue) in AquaDock CRM v5

**Audience:** Developers maintaining email campaigns, contact sync, or Brevo-related Server Actions.

**What Brevo is:** A third-party email and marketing API. This CRM talks to Brevo from **server-side code** using the official **Node.js SDK v5** package **`@getbrevo/brevo`**.

---

## How this repository uses it

| Item | Location / note |
| --- | --- |
| SDK | `@getbrevo/brevo` (see `package.json`) |
| Server integration | [`src/lib/services/brevo.ts`](../src/lib/services/brevo.ts) — `BrevoClient`, error mapping (401 key type, 429 rate limit), campaign/contact helpers |
| UI | Under `src/app/(protected)/brevo/` and `src/components/features/brevo/` |

**API keys:** Brevo distinguishes **REST API keys** (often prefix `xkeysib-`) from **SMTP relay keys** (`xsmtpsib-`). REST operations against `api.brevo.com` need the correct key type; the service layer surfaces a German hint on `401` when the key is wrong (see `BREVO_401_REST_KEY_HINT` in `brevo.ts`).

**Legacy package:** The repo also lists the `brevo` npm package for compatibility with older call sites; prefer `@getbrevo/brevo` for new code.

---

## Official documentation (external)

- **Node.js client:** [Brevo API clients — Node.js](https://developers.brevo.com/docs/api-clients/node-js)  
- **REST reference:** [Brevo API reference](https://developers.brevo.com/reference)  
- **Source:** [getbrevo/brevo-node on GitHub](https://github.com/getbrevo/brevo-node)

v5 is a unified `BrevoClient` with namespaced services (e.g. `transactionalEmails`, `contacts`). It is **not** API-compatible with the old v3 class-per-resource style; migrate any copied snippets accordingly.

---

## Quick SDK example (generic)

Not copied from app code — illustrates v5 shape only:

```typescript
import { BrevoClient } from "@getbrevo/brevo";

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) throw new Error("BREVO_API_KEY is not set");
const brevo = new BrevoClient({ apiKey });

await brevo.transactionalEmails.sendTransacEmail({
  subject: "Hello",
  htmlContent: "<p>Hello</p>",
  sender: { name: "CRM", email: "verified-sender@yourdomain.com" },
  to: [{ email: "user@example.com" }],
});
```

Use env vars in Vercel **without** the `NEXT_PUBLIC_` prefix for secrets.

---

## Errors and retries

The SDK can throw typed errors (e.g. `BrevoError`, `UnauthorizedError`, `TooManyRequestsError`). This repo centralizes mapping in `mapBrevoClientError` for user-visible messages. For full SDK behavior (retries, timeouts, logging), read the official Node.js client docs above.

---

Last reviewed: April 2026
