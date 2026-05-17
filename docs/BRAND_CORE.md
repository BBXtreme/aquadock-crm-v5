# AquaDock Brand Core (Product + Marketing)

**Status:** Draft v1  
**Purpose:** Shared brand standard across marketing website and CRM product surfaces.

This document defines what must stay consistent across channels.  
Marketing and CRM can use different patterns, but should feel like the same brand.

---

## 1. Brand intent

AquaDock should always feel:

- Calm
- Premium
- Trustworthy
- Nature-connected
- Practical and clear

Default when uncertain: **simpler, calmer, more spacious**.

---

## 2. Universal principles

- **Clarity first:** users should understand the main action within 3 seconds.
- **Color restraint:** neutral surfaces dominate; accent color is intentional.
- **Hierarchy over decoration:** structure via typography and spacing, not visual effects.
- **Concrete language:** clear claims, specific wording, no hype.
- **Accessibility baseline:** visible focus, keyboard support, AA contrast, reduced-motion support.

---

## 3. Shared color behavior

- Use neutral backgrounds as the default foundation.
- Use brand accent colors for priority and meaning, not decoration.
- Avoid multiple competing saturated accents in one viewport.
- Reserve warning, destructive, and success colors for status semantics.
- Keep text and controls at or above WCAG AA contrast.

---

## 4. Shared typography behavior

- Prioritize readability and fast scanability.
- Keep headings concise and outcome-oriented.
- Keep body copy short and concrete.
- Channel-specific font stacks are allowed if hierarchy and tone remain consistent.

---

## 5. Voice and microcopy

- Short-to-medium sentences.
- Action-led CTA labels.
- Evidence-based claims where possible.
- No exaggerated promises.
- Helpful, direct empty/error/success states.

Examples:

- Prefer `Start project inquiry` over `Learn more`.
- Prefer `We usually reply within 24 hours` over vague reassurance.

---

## 6. Motion and interaction

- Motion should guide understanding, not entertain.
- Keep interactions quick and subtle.
- Avoid dramatic or distracting effects.
- Respect `prefers-reduced-motion`.
- Never remove visible focus states.

---

## 7. Channel profiles

### Marketing profile

- Editorial, image-led, narrative structure.
- One core message per section.
- High whitespace and composition discipline.
- Must follow `docs/BRAND_GUIDE.md`.

### CRM profile

- Utility-first, workflow-oriented, high scanability.
- Dense where necessary, always readable.
- Stable component patterns for forms, tables, filters, and states.
- May use product-specific token systems if shared brand intent is preserved.

---

## 8. Non-negotiables

A screen does not ship if any of these fail:

- Primary action is unclear.
- Focus visibility or keyboard support is broken.
- Accent usage creates visual noise.
- Copy is vague, hype-heavy, or untrustworthy.
- Status color semantics are inconsistent.

---

## 9. Lightweight review gate

Before release, verify:

1. The screen feels calm and premium.
2. Hierarchy is obvious at first glance.
3. Accent color usage is intentional.
4. Copy is concrete and credible.
5. Accessibility basics are satisfied.

---

## 10. Source of truth model

- `docs/BRAND_GUIDE.md`: marketing source of truth.
- `docs/BRAND_CORE.md`: cross-channel brand core.
- CRM component docs and design tokens: product implementation source of truth.

When rules conflict:

1. Accessibility and clarity first.
2. Channel objective second.
3. Shared brand intent always.
