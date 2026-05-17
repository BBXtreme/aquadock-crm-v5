# Aquadock Brand & Design Guide v3.0 — Editorial Premium

**Last updated:** May 16, 2026
**Status:** Active — single source of truth for brand, content and visual execution
**Version:** 3.0 (full design-system pass: strategy + spatial system + editorial layout standards)
**Applies to:** Homepage, Station, Partner, About, FAQ, Contact, Legal, all current and future landing pages, kiosk surfaces and marketing exports.

This guide is the authoritative reference for everyone shipping Aquadock surfaces — designers, copywriters, developers, and AI coding agents. If a decision is not covered here, default to "calmer, simpler, more spacious."

### Related standards

- Cross-channel brand baseline (marketing + CRM): `docs/BRAND_CORE.md`
- This guide remains the source of truth for marketing and editorial landing surfaces.

---

## Table of contents

1. Brand foundations
2. Audience model
3. Messaging architecture
4. Voice & tone
5. Claims & compliance
6. Design philosophy (the north star)
7. Color system
8. Typography system
9. Spatial system (grid, spacing, rhythm)
10. Editorial layout recipes
11. Imagery & art direction
12. Content density limits
13. Component standards
14. Interaction & motion
15. Accessibility & readability gates
16. Page intent map
17. Conversion rules
18. i18n & content operations
19. Phase 1 legacy rules
20. Pre-launch visual QA checklist
21. Changelog

---

## 1. Brand foundations

- **Tagline:** `Paddle. Live. Enjoy.`
- **Category statement:** Autonomous kayak and SUP vending hubs for modern waterfronts.
- **Brand promise:** Spontaneous, safe water access for guests; structured, scalable revenue for operators and investors.
- **Brand character:** Calm. Premium. Nature-connected. Pragmatic. Trustworthy.
- **Internal positioning:** *Aquadock turns waterfront footfall into autonomous paddle experiences and measurable business outcomes.*

### Brand archetypes (blend, do not pick one)

- **The Explorer** — freedom, discovery, the joy of being outside.
- **The Sage** — operational clarity, calm authority, evidence over hype.

The website should feel like a **National Geographic editorial** wrapped around an **Apple-grade product page**.

---

## 2. Audience model

Every page serves one **primary** audience and remains legible to the other.

### A) Water enthusiasts (B2C)

- **Intent:** *Can I get on the water quickly and safely?*
- **Primary message:** `Scan. Book. PIN. Paddle.`
- **Proof they need:** simplicity, safety cues, real photography, transparent availability.
- **Tone:** inviting, energetic, low-friction.
- **CTA verbs:** *Book*, *Find a station*, *See how it works*.

### B) Investors / operators / partners (B2B)

- **Intent:** *Will this station model deliver predictable returns at my site?*
- **Primary message:** Autonomous operation with structured rollout and support.
- **Proof they need:** operational model, staffing impact, utilisation logic, rollout milestones, support scope.
- **Tone:** confident, concrete, outcome-oriented.
- **CTA verbs:** *Request project*, *Become a partner*, *Review station model*.

> Rule: A page is allowed to address **both** audiences only when content is split into clearly labelled tracks (e.g. "For paddlers" / "For operators").

---

## 3. Messaging architecture

Long-form pages follow this rhythm:

1. **Lifestyle hook** — emotion, water moment, aspiration.
2. **System clarity** — how Aquadock works in 3–4 unambiguous steps.
3. **Proof & outcomes** — guest value + business value, supported by imagery and numbers.
4. **Conversion** — one dominant next action for the page audience.

### Copy formula

`Claim → Evidence → Human or business consequence`

Example:

- **Claim:** Autonomous handout and return.
- **Evidence:** QR booking, PIN unlock, digital workflow.
- **Consequence:** Guests launch faster; site teams run leaner.

### Required ingredients per page

- One **hero promise** (≤ 8 words).
- One **subhead** (≤ 20 words) that explains the promise.
- At least one **proof block** (photo + claim + 1–2 sentence evidence).
- One **dominant CTA** + at most one **secondary CTA**.

---

## 4. Voice & tone

- **Voice:** warm confidence. Quietly premium.
- **Sentence style:** short to medium. Concrete verbs. Active voice. Minimal buzzwords.
- **Avoid:** overpromising, vague "innovation" copy, aggressive sales language, exclamation marks (max one per page).
- **Preferred language:** plain, precise, premium.

### Tone by context

| Context        | Tone                                |
| -------------- | ----------------------------------- |
| Hero           | Emotional + clear                   |
| Process        | Instructional, frictionless         |
| Investor / B2B | Commercially disciplined, specific  |
| Legal / FAQ    | Direct, unambiguous                 |
| Microcopy      | Helpful, never cute                 |

### House style

- Sentence case for headings (no Title Case).
- Oxford comma in English.
- Numerals for quantities (`24/7`, `4 steps`), not spelled out.
- One space after periods.
- En dash for ranges (`9–18`), em dash sparingly for asides.

---

## 5. Claims & compliance guardrails

Only publish claims that operations, contracts, or analytics can support.

- Use hedging language when results vary by site: `can`, `designed to`, `typically`, `structured to`.
- Avoid absolutes: *always profitable*, *zero maintenance*, *no risk*.
- Frame ROI as a **location-specific projection**, never as a guarantee.
- Sustainability claims must be **specific and verifiable** (no "eco-friendly" without a concrete reason).
- Anything quantitative (utilisation, revenue, uptime) must have a footnote-able source.

---

## 6. Design philosophy — the north star

Aquadock's surfaces should feel **calm, confident, and outdoors**. The user should feel they have room to breathe — the same way they would on the water.

### Five non-negotiable principles

1. **One idea per screen.** Each section makes a single point. If you need a second point, build a second section.
2. **Photography leads.** Pictures are the primary storyteller; copy supports them, never competes.
3. **Whitespace is content.** Empty space is not waste — it is the brand.
4. **Hierarchy over decoration.** Type weight, scale, and rhythm carry the design. No drop shadows, gradients, or borders unless they earn their place.
5. **Earned color.** Color is rare and intentional. Most of the page is white, warm canvas, or photography. Brand color appears at moments that matter (CTAs, key proofs, hero scrims).

### What we are not

- We are not a startup landing page (no neon gradients, no glassmorphism, no AI-generated illustration).
- We are not a corporate SaaS site (no stock business photography, no "trusted by" logo soup unless real).
- We are not a sportswear brand (no shouting, no high-contrast action sports tropes).

---

## 7. Color system

### 7.1 Core tokens (locked)

| Token                      | Hex       | Role                                   |
| -------------------------- | --------- | -------------------------------------- |
| Primary (Nature Vitality)  | `#66BB6A` | Living/active accent, eco signal       |
| Secondary (Water)          | `#00A0C4` | Water signal, links, info accents      |
| Accent Teal                | `#26A69A` | Bridges nature & water, supporting UI  |
| CTA Orange                 | `#FF6F00` | Primary call-to-action only            |
| Sunset Coral               | `#FF7F50` | Secondary CTA, warmth                  |
| Ink (Dark Text)            | `#001F3F` | Headlines, body                        |
| Ink Muted                  | `#5C7A8A` | Captions, supporting copy              |
| Deep Navy                  | `#0A1628` | High-impact moments, quotes            |

### 7.2 Editorial surfaces

```css
:root {
  --canvas-warm: #f6f7f4;
  --canvas-mist: color-mix(in srgb, var(--brand-water-subtle) 35%, var(--canvas-warm));
  --hairline:    color-mix(in srgb, var(--brand-border) 55%, transparent);
  --ink-soft:    color-mix(in srgb, var(--brand-ink) 88%, white 12%);
  --scrim-deep:  rgba(10, 22, 40, 0.55);
  --scrim-mid:   rgba(10, 22, 40, 0.28);
  --scrim-warm:  color-mix(in srgb, var(--brand-teal) 18%, transparent);
}
```

### 7.3 Color discipline (the 70 / 25 / 5 rule)

On any given screen:

- **70%** neutral surfaces — white, `--canvas-warm`, `--canvas-mist`, photography neutrals.
- **25%** ink and muted ink — typography, hairlines.
- **5%** brand accent — primary, water, teal, or CTA orange/coral.

Hard rules:

- **Only one CTA color per section** (never orange and coral side by side).
- Backgrounds use **canvas tones**, not brand color, except in scrim zones.
- Deep Navy is reserved for **quotes**, **sticky asides**, and **high-impact moments** — never as a default section background.
- Never tile two saturated brand colors next to each other.

### 7.4 Contrast minimums

- Body text on background: **≥ 7:1** (AAA where possible).
- Large headings: **≥ 4.5:1** (AA).
- Text over photos: scrim required to reach AA, or place text **outside** the image.

---

## 8. Typography system

### 8.1 Families

- **Poppins** — headings, UI, body.
- **Montserrat** — CTAs and accents.
- Loaded via `next/font/google` in `src/lib/fonts.ts`.

### 8.2 Scale (modular, mobile-first)

| Role        | Size                                     | Weight  | Line height | Tracking |
| ----------- | ---------------------------------------- | ------- | ----------- | -------- |
| Display     | `clamp(3rem, 6vw, 4.5rem)`               | 600     | 1.05        | -0.02em  |
| H1 (Hero)   | `clamp(2.5rem, 5vw, 4rem)`               | 600     | 1.1         | -0.015em |
| H2 (Chapter)| `clamp(2rem, 3.5vw, 2.75rem)`            | 600     | 1.15        | -0.01em  |
| H3          | `clamp(1.5rem, 2.5vw, 1.875rem)`         | 600     | 1.2         | -0.005em |
| H4          | `1.25rem`                                | 600     | 1.3         | 0        |
| Body L      | `1.125rem` (18px)                        | 400     | 1.65        | 0        |
| Body        | `1rem` (16px)                            | 400     | 1.6         | 0        |
| Caption     | `0.875rem` (14px)                        | 500     | 1.5         | 0.01em   |
| Eyebrow     | `0.75rem` (12px) UPPERCASE               | 600     | 1.4         | 0.12em   |

### 8.3 Reading rules

- Body line length: **45–75 characters** (target 65). Use `max-w-prose` or `max-w-[640px]`.
- Headings: always `text-balance`. Hero titles: `text-wrap: balance` + `text-pretty` for orphan control.
- Paragraphs: max **3–4 lines** before a break or visual.
- Never center body copy. Center only short headlines and eyebrows.
- Eyebrows always sit above headings, never below. One eyebrow per section.
- German headlines must provide an optional `heroTitleShort` for narrow viewports.

### 8.4 Vertical rhythm

- Heading → next element: `0.5em` (tight) to `1em` (default).
- Paragraph → paragraph: `1em`.
- Section heading → first paragraph: `0.75em` minimum, `1.25em` editorial.

---

## 9. Spatial system

The single most important section of this guide. Whitespace is the brand.

### 9.1 Spacing scale (px)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160`

Use this as the **primary design scale**. Minor optical adjustments are allowed when required by responsive constraints, but deviations must be intentional and documented in code comments or changelog notes.

### 9.2 Grid

- **Max content width:** `1200px` (`max-w-6xl` continues to apply).
- **Wide editorial width:** `1320px` (only for hero and full-bleed sections).
- **Text column max:** `640px` for prose, `720px` for chapter intros.
- **Columns:** 12-column grid; 8-column on tablet; 4-column on mobile.
- **Gutters:** `32px` desktop, `24px` tablet, `16px` mobile.
- **Page side padding:** `clamp(20px, 4vw, 48px)`.

### 9.3 Section (chapter) padding

| Viewport       | Vertical padding (`--chapter-pad-y`) |
| -------------- | ------------------------------------ |
| Mobile (<640)  | `56–72px`                            |
| Tablet         | `72–96px`                            |
| Desktop        | `96–128px`                           |
| Editorial / air| `128–160px`                          |

The current token `--station-chapter-pad-y: clamp(3.25rem, 8vw, 7rem)` is canonical.

### 9.4 Section-to-section rhythm

- Two adjacent sections must change at least **one** of: surface tone, image dominance, layout direction.
- Never stack two text-heavy sections in a row. Insert a photo, quote, or filmstrip between them.
- Never stack two full-bleed images in a row. Separate with a quiet canvas chapter.

### 9.5 Component spacing

- Card internal padding: `24–32px` desktop, `20px` mobile.
- Button padding: `12px 20px` (default), `16px 28px` (hero).
- Form fields: `48–56px` height, `12px` gap between fields, `24px` between groups.
- Icon ↔ label gap: `8–12px`.

---

## 10. Editorial layout recipes

Use these as the canonical building blocks. Compose pages from them; do not invent one-off layouts.

### R1 · Editorial photo hero (`MarketingEditorialPhotoHero`)

- Aspect ratio target: **16:9 desktop**, **4:5 mobile**.
- Allowed exception: **4:3 mobile** when image safety (faces/hardware) or localized headline length requires a wider crop.
- Image takes **65–75% of viewport height** desktop; **50–60%** mobile.
- Eyebrow + H1 + 1-line subhead + one CTA. Nothing else.
- Scrim only where text sits; rest of the photo stays unobstructed.
- No more than **18 words** total over the image.

### R2 · Quiet chapter (text-led)

- Single column, `max-w-[720px]`, centered or left-aligned.
- Eyebrow → H2 → 2–3 short paragraphs → optional inline link.
- Surface: `--canvas-warm` or white. Generous top/bottom padding.

### R3 · Image-left / text-right (and mirror)

- 50/50 on desktop; image stacks **above** text on mobile.
- Image: 4:3 or 3:2 ratio, full-bleed within the column, `rounded-2xl`.
- Text column: eyebrow + H3 + 2-paragraph max + one inline CTA.
- Alternate direction every other instance to create rhythm.

### R4 · Three-up cards

- Max **3 cards per row** desktop, **2** tablet, **1** mobile.
- Each card: optional small image (3:2), H4, **one** sentence, max **3** bullets.
- All cards in a row must share the same height and card surface.

### R5 · Process / stepper

- 3–6 steps maximum.
- Each step: number + 2–4 word title + 1 sentence body.
- Numbers are **decorative**, not loud. Use `Ink Muted` or hairline circles.

### R6 · Proof filmstrip (`MarketingProofFilmstrip`)

- Horizontal scroll-snap row, 4–8 photos.
- Tile size: `h-48 sm:h-56`, `object-cover`, `rounded-2xl`.
- No captions inside tiles. Optional caption row below the strip.

### R7 · Editorial quote (`MarketingEditorialQuote`)

- Deep Navy or `--canvas-mist` surface.
- Quote ≤ 22 words. Attribution on a separate line.
- One per page maximum.

### R8 · Sticky aside (B2B)

- Right column, `~360px`, sticky from second chapter onward.
- Contains: kicker + title + 2–3 benefits + one CTA.
- Hidden on mobile; replaced by sticky bottom bar.

### R9 · Full-bleed lifestyle bleed

- Image spans 100vw, height `clamp(360px, 60vh, 720px)`.
- Optional pull quote overlay, top-left, max 12 words.
- Used at most **once** per page.

### R10 · Final CTA band

- `--canvas-mist` or warm-scrim photo background.
- One H2, one sentence, one primary CTA, one secondary link.
- Always the last block before the footer.

---

## 11. Imagery & art direction

Photography is the lead medium. Treat it like an editorial magazine, not stock.

### 11.1 Look and feel

- **Light:** golden hour, soft overcast, dawn mist. Avoid harsh midday sun.
- **Palette grading:** soft natural greens and teals, warm highlights, gentle film grain acceptable.
- **Composition:** rule of thirds, horizon respected, generous negative space (sky, water).
- **People:** real users, candid moments, mixed ages, no posed model shots.
- **Hardware:** annotated, clean, weathered-but-cared-for. Show the station in context, not floating.

### 11.2 Aspect ratios (canonical)

| Use                   | Desktop | Mobile |
| --------------------- | ------- | ------ |
| Hero                  | 16:9    | 4:5    |
| Editorial split       | 4:3     | 4:5    |
| Card thumbnail        | 3:2     | 3:2    |
| Filmstrip tile        | 4:3     | 4:3    |
| Full-bleed lifestyle  | 21:9    | 4:5    |

### 11.3 Image dominance rules

- At least **one significant image every 1.5 scroll screens**. No long text deserts.
- Hero, full-bleed, and editorial split images are the priority — cards and tiles are supporting cast.
- Photo + text overlap is allowed **only on heroes and full-bleeds** with a proper scrim.
- On all other layouts, copy sits **outside** the image.
- Never crop a face, hand, or paddle awkwardly. If an image won't crop cleanly to the required ratio, swap the image, do not letterbox.

### 11.4 Technical standards

- Source: AVIF/WebP with JPEG fallback.
- Largest hero: ≤ **220 KB** after compression at 1920w.
- Always provide `width`, `height`, descriptive `alt`, and `priority` for above-the-fold heroes.
- Use Next.js `<Image>` for marketing imagery; never raw `<img>` for content photography.
- Asset location: `public/brand/marketing/`.

### 11.5 What to avoid

- AI-generated photography of people or hardware.
- Generic stock kayaking imagery.
- Heavy filters, vignettes, oversaturated grading.
- Photos with embedded text.
- Mixed grading within the same chapter.

---

## 12. Content density limits

Hard ceilings. If copy exceeds these, cut or split into another section.

| Element              | Max                                              |
| -------------------- | ------------------------------------------------ |
| Hero H1              | 8 words                                          |
| Hero subhead         | 20 words                                         |
| Eyebrow              | 4 words                                          |
| Section H2           | 10 words                                         |
| Body paragraph       | 3–4 lines (~60 words)                            |
| Card title           | 5 words                                          |
| Card body            | 1 sentence                                       |
| Card bullets         | 3                                                |
| Process step body    | 1 sentence (~16 words)                           |
| Quote                | 22 words                                         |
| Buttons / CTAs       | 3 words ideal, 5 words absolute max              |
| CTAs per section     | 1 primary, 1 optional secondary                  |
| Sections per page    | 6–8 (excluding header, footer, final CTA band)   |

> If you cannot fit your message in these limits, the message is the problem, not the limit.

---

## 13. Component standards

All marketing components live in `src/components/marketing/`.

### Canonical primitives

- `MarketingChapter` — every section uses this.
- `MarketingEditorialPhotoHero` — heroes (use `scrimVariant="station-warm"`).
- `MarketingProofFilmstrip` — proof imagery rows.
- `MarketingEditorialQuote` — quotes.
- `MarketingConversionCard` — sticky aside / form cards.
- `RentalFlowSteps` — guest journey stepper.
- `Section`, `SectionHeader`, `Prose` — layout helpers.

### Density and tone props

```ts
type Density   = "air" | "content" | "tight";
type Tone      = "canvas" | "mist" | "paper" | "deep";
type Separator = "none" | "hairline";
```

- `air` — heroes, manifesto, final CTA.
- `content` — default chapter density.
- `tight` — filmstrips, dense lists.
- `deep` tone reserved for quotes and high-impact moments.

### Buttons

- Primary: CTA Orange, white text, `rounded-full`, `font-cta` (Montserrat).
- Secondary: outlined Ink, transparent fill.
- Tertiary / inline: text link with underline on hover.
- Never more than **one** primary button per visible viewport.

### Cards

- Surface: white on canvas, or `--canvas-warm` on white.
- Border: `--hairline` only when needed for separation.
- Radius: `rounded-2xl`.
- Hover: `-translate-y-0.5` + `shadow-md`, 280ms ease-out.
- Prefer no drop shadow at rest; exceptions are allowed for overlap cards or conversion-critical modules when they improve separation and readability.

### Forms

- Embedded inside chapters, never floating.
- Single column on mobile, max two columns on desktop.
- Labels above fields, never inside.
- Error states: text + icon + color; never color alone.

---

## 14. Interaction & motion

Calm, intentional, fast.

- **Durations:** UI `150–200ms`, content reveal `240–320ms`. Nothing exceeds 400ms.
- **Easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` (ease-out) for most; `ease-in-out` for symmetrical motion.
- **Hover lift:** max **4px** translate + shadow change. No scale > 1.02.
- **Scroll reveals:** opacity 0→1 + 8px translate. Never stagger more than 80ms between siblings.
- **Carousels & filmstrips:** native CSS `scroll-snap`. No JS-driven animation libraries unless approved.
- **No parallax** unless explicitly approved per-page.
- **Reduced motion:** all animations gated behind `@media (prefers-reduced-motion: no-preference)`.

---

## 15. Accessibility & readability gates

A page does not ship unless it meets all of these.

- Text contrast: AA minimum, AAA for body where possible.
- Focus rings: visible, `2px` offset, brand water or ink — never removed.
- Tap targets: ≥ **44×44px**.
- Forms: label + `aria-describedby` for errors, no placeholder-as-label.
- Images: meaningful `alt`; decorative images use `alt=""`.
- Semantic structure: one `<h1>`, ordered headings, landmarks (`header`, `main`, `footer`, `nav`).
- Keyboard: every interactive element reachable and operable in tab order.
- Motion: respects `prefers-reduced-motion`.
- Language: `lang` attribute set per locale; copy machine-translatable (avoid idiom-heavy phrasing).

---

## 16. Page intent map

Each page has one job and one dominant CTA.

| Page      | Audience  | Job                                                                | Dominant CTA                  |
| --------- | --------- | ------------------------------------------------------------------ | ----------------------------- |
| Homepage  | B2C       | Inspire, explain the flow, route to booking or station info        | `Book now` / `Find a station` |
| Station   | B2B       | Explain operator model + rollout, prove credibility                | `Start project inquiry`       |
| Partner   | B2B       | Position the partner program, frame economics                      | `Become a partner`            |
| About     | Both      | Build trust through mission, founders, real momentum               | `Get in touch`                |
| FAQ       | Both      | Remove friction, surface answers fast                              | Context-dependent             |
| Contact   | Both      | Route the right inquiry to the right channel                       | `Send a message`              |
| Legal     | Both      | Be unambiguous, scannable, and complete                            | n/a                           |

---

## 17. Conversion rules

- One **dominant CTA per page**, repeated at: hero, after first proof block, at page end.
- One **secondary CTA** maximum, lower visual weight (text link or outlined).
- CTA text uses **action verbs**: *Start project inquiry* > *Learn more*.
- CTAs match audience intent — never present "Become a partner" to a paddler.
- Sticky bottom bar on mobile for B2B pages; sticky right aside on desktop.
- Forms reachable in **≤ 1 click** from any chapter via in-page link.
- Confirmation states acknowledge the user by name/email and set a clear expectation ("we usually reply within 24 hours").

---

## 18. i18n & content operations

- Locales: German (default), English, Croatian, plus `es`, `it`, `el` and future expansions.
- All marketing strings live in `messages/*.json`.
- Run `pnpm check:i18n` after every content change.
- German is the **canonical source** for tone calibration. English mirrors warmth, not corporate gloss.
- Provide `heroTitleShort` for German on narrow viewports.
- MDX is permitted only as a thin wrapper for routing or static-export safety.
- Untouched legacy sections retain Phase 1 parity until explicitly refreshed.

---

## 19. Phase 1 legacy rules (still active)

- Visual parity with the live WordPress/Elementor site for any untouched page.
- Static export rules (`output: 'export'`, `public/index.html`, `.htaccess`) unchanged.
- Logo height, favicon, and imagery crops match the live site unless a deliberate premium refresh is approved.
- No new logotype, no major color shift without explicit approval.

---

## 20. Pre-launch visual QA checklist

A page may go live only when **every** item passes.

### Strategy
- [ ] Page audience is unambiguous (B2C, B2B, or clearly split).
- [ ] One dominant CTA, repeated 3 times.
- [ ] Messaging follows hook → clarity → proof → conversion.

### Composition
- [ ] One idea per section.
- [ ] No two text-heavy sections in a row.
- [ ] No two full-bleed images in a row.
- [ ] At least one significant image every 1.5 scroll screens.
- [ ] Section padding from the canonical scale.

### Typography
- [ ] Body line length 45–75 characters.
- [ ] All headings `text-balance` (or pretty).
- [ ] Hero ≤ 8 words; subhead ≤ 20 words.
- [ ] Eyebrow precedes heading; one per section.

### Color & imagery
- [ ] 70 / 25 / 5 color discipline holds.
- [ ] One CTA color per section.
- [ ] No copy on busy photos without scrim.
- [ ] All imagery from `public/brand/marketing/` with proper alt and dimensions.
- [ ] Largest hero image ≤ 220 KB.

### Component density
- [ ] Cards: ≤ 3 per row, ≤ 1 sentence + 3 bullets each.
- [ ] Process: ≤ 6 steps.
- [ ] Buttons: ≤ 5 words.
- [ ] One quote per page maximum.

### Interaction & a11y
- [ ] AA contrast across all text.
- [ ] Visible focus rings.
- [ ] 44×44 tap targets.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Keyboard tab order is logical.

### Performance
- [ ] LCP ≤ 2.5s on 4G.
- [ ] CLS ≤ 0.05.
- [ ] Hero image uses `priority`; below-the-fold images lazy.
- [ ] No unused fonts, no JS animation libraries unless approved.

### Content ops
- [ ] All strings in `messages/*.json`.
- [ ] `pnpm check:i18n` passes.
- [ ] No claim violates Section 5.

---

## 21. Changelog

- **2026-05-16** — **v3.0**: Full design-system pass. Added design philosophy, spatial system, editorial layout recipes, image dominance rules, content density ceilings, motion standards, a11y gates, and pre-launch QA checklist.
- **2026-05-16** — v2.2: Dual-audience framework, claim guardrails, page intent map, conversion rules.
- **2026-05-16** — v2.1: Sharpened tokens, typography scale, component contracts, enforcement language for coding agents.
- **2026-05-16** — v2.0: Balanced premium direction merged with Phase 1.
- **2026-05-14** — v1.7.1: Initial imagery and font implementation.
- **2026-05-12** — v1.0: Phase 1 parity documentation.

---

**This document is authoritative for every brand, design, copy, and implementation decision on Aquadock surfaces.** When in doubt: less, calmer, more spacious. Let the water and the light do the talking.
