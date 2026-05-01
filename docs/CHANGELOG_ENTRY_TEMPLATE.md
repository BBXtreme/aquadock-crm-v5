# Changelog entry template (in-app)

Product-facing release notes live in [`src/content/changelog.ts`](../src/content/changelog.ts). Each deploy that bumps the app version should add a matching entry at the **top** of the `changelogEntries` array (newest first).

See also: [README — Maintaining the In-App Changelog](../README.md#maintaining-the-in-app-changelog).

## Voice

- Write **from the user’s perspective** — benefits for **marina, hotel, restaurant, and water-sports** teams.
- **German primary** (main market), informal **Du** with capital address forms — see [`german-du-style.md`](german-du-style.md). **English** and **Croatian** follow the same warmth: direct **you** voice in EN; informal **ti** in HR (`src/messages/`). Multilingual bullet text can follow later.
- Avoid engineering-only wording (internal service names, SQL, “refactor”).

## Paste & fill (TypeScript object)

```ts
{
  version: "1.3.0",
  releasedAt: "2026-05-01",
  title: "🚀 Noch mehr Komfort & Geschwindigkeit für Deinen Alltag",
  changes: [
    {
      type: "feature",
      text: "Neuer In-App Changelog – Du siehst sofort, was sich verbessert hat und wie es Dir Zeit spart",
    },
    {
      type: "improvement",
      text: "OpenMap lädt noch schneller und zeigt klarere Cluster – perfekte Übersicht auf einen Blick",
    },
    {
      type: "fix",
      text: "Verbesserte Stabilität bei der AI-Anreicherung von Firmendaten",
    },
  ],
},
```

**`type`:** one of `feature` | `improvement` | `fix` | `security` — max **6** items per release.

## Tips

- Use one emoji at the start of `title` for visual pop (🚀 ✨ ⚡).
- Keep bullets short, warm, and benefit-driven.
- Run `pnpm typecheck && pnpm check:fix` — Zod validates the file.
