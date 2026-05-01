# UI copy voice — DE · EN · HR (AquaDock CRM)

**Scopes**

- **German:** `src/messages/de.json` and any German literals in code (toasts, transactional email, server errors).
- **English:** `src/messages/en.json` — natural **you**; short, direct imperatives (no excess “please”).
- **Croatian:** `src/messages/hr.json` — informal **ti** / **tvoj** / **tvoja** / **tvoje** and second-person singular imperatives — not formal **vi** / **vaš** team-addressing in product UI.

Companion: German rules below; EN/HR mirror the same rapport and warmth as DE.

---

## German (Du)

### Capitalization

- **Always capitalize** the informal address forms when they refer to the reader: **Du, Dich, Dir, Dein, Deine, Deinem, Deinen, Deiner, Euch** (rare plural).
- Matches the traditional „Anrede-Du“ in writing and keeps CRM copy consistent.
- **Exception:** Example email local-parts (e.g. `deine@email.de`) stay **lowercase** — not a pronoun addressing the reader.
- Technical identifiers (`AI_GATEWAY_API_KEY`, CLI hints) stay as-is.

### Tone

- **Du** everywhere for the AquaDock ↔ user relationship; **no** Sie / Ihre / Ihr for that voice.
- Prefer **direct imperatives** (*Wähle, Lege fest, Öffne*) plus **Du** statements where they read more naturally.
- Stay **professional and upbeat**; avoid slang unless on-brand.
- **Admin / third-party actions** stay third person (*Ein Administrator prüft …*). Applicant flows still use **Du** for the person applying.
- **Outbound campaign placeholders** (`{{anrede}}`) can stay neutral toward the marina’s customer; CRM UI Du does not dictate customer email tone.

---

## English

- No formal/informal split like German; use plain **you / your**.
- Prefer **direct instructions** (*Sign in.*, *Check your balance.*, *Reload the page.*) aligned with German brevity; avoid stacking *please* in errors and CTAs unless it noticeably softens a harsh line.

---

## Croatian (ti)

- Use **singular informal** addressing the logged-in CRM user (*ti*, *tvoj*, *tvoja*, imperative *odaberi*, *unesi*, *prijavi se*).
- Do **not** use plural/formal **vi** / **vaš** for that relationship in UI strings (placeholders may still impersonate outbound mail to contacts — keep warm and natural).
- **Example addresses** (`ti@firma.hr`): lowercase local-part is fine.
- Narration about admins stays neutral (*Administrator će pregledati tvoj zahtjev*).

---

## Maintenance

- After editing locale keys: `pnpm messages:validate`.
- Prefer sourcing repeated UI lines from `@/messages` rather than duplicating strings in TS.
