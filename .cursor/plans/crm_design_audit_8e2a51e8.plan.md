---
name: CRM Design Audit
overview: Audit complete for the AquaDock CRM visual system. The plan phases the redesign from foundation tokens and shared shells to the premium auth experience and then the protected-route rollout.
todos:
  - id: tokens-audit
    content: Standardize color, typography, chart, radius, and shadow tokens in globals.css.
    status: completed
  - id: shell-unification
    content: Define shared protected-route page shell and header patterns.
    status: completed
  - id: component-replacements
    content: Map custom or ad-hoc UI patterns to shadcn-first compositions.
    status: pending
  - id: login-redesign
    content: Redesign the login page into the first premium landing/auth experience.
    status: completed
isProject: false
---

# AquaDock CRM Design System Audit

## Objective
Unify AquaDock CRM into a premium, water-inspired SaaS UI by standardizing theme tokens, page shells, component composition, and auth presentation before broad route-by-route rollout. The target tone is clean, modern, operationally smart, and subtly adventurous, aligned with AquaDock's 24/7 autonomous watersports brand rather than a generic dark B2B dashboard.

## Key Audit Anchors
- Theme foundation: [`/Users/marco/code/aquadock-crm-v5/src/app/globals.css`](/Users/marco/code/aquadock-crm-v5/src/app/globals.css)
- shadcn config: [`/Users/marco/code/aquadock-crm-v5/components.json`](/Users/marco/code/aquadock-crm-v5/components.json)
- Protected shell: [`/Users/marco/code/aquadock-crm-v5/src/components/layout/AppLayout.tsx`](/Users/marco/code/aquadock-crm-v5/src/components/layout/AppLayout.tsx), [`/Users/marco/code/aquadock-crm-v5/src/components/layout/Header.tsx`](/Users/marco/code/aquadock-crm-v5/src/components/layout/Header.tsx), [`/Users/marco/code/aquadock-crm-v5/src/components/layout/Sidebar.tsx`](/Users/marco/code/aquadock-crm-v5/src/components/layout/Sidebar.tsx)
- Repeated list-page pattern: [`/Users/marco/code/aquadock-crm-v5/src/app/(protected)/dashboard/page.tsx`](/Users/marco/code/aquadock-crm-v5/src/app/(protected)/dashboard/page.tsx), [`/Users/marco/code/aquadock-crm-v5/src/app/(protected)/companies/ClientCompaniesPage.tsx`](/Users/marco/code/aquadock-crm-v5/src/app/(protected)/companies/ClientCompaniesPage.tsx), [`/Users/marco/code/aquadock-crm-v5/src/app/(protected)/contacts/ClientContactsPage.tsx`](/Users/marco/code/aquadock-crm-v5/src/app/(protected)/contacts/ClientContactsPage.tsx)
- Styling outliers: [`/Users/marco/code/aquadock-crm-v5/src/app/(protected)/dashboard/DashboardClient.tsx`](/Users/marco/code/aquadock-crm-v5/src/app/(protected)/dashboard/DashboardClient.tsx), [`/Users/marco/code/aquadock-crm-v5/src/components/tables/CompaniesTable.tsx`](/Users/marco/code/aquadock-crm-v5/src/components/tables/CompaniesTable.tsx), [`/Users/marco/code/aquadock-crm-v5/src/components/ui/StatCard.tsx`](/Users/marco/code/aquadock-crm-v5/src/components/ui/StatCard.tsx)
- Auth surface: [`/Users/marco/code/aquadock-crm-v5/src/app/(auth)/login/page.tsx`](/Users/marco/code/aquadock-crm-v5/src/app/(auth)/login/page.tsx)

## Proposed Rollout
1. Normalize the design foundation in `globals.css`: define a small semantic token set with a refined aqua/teal primary, a quieter aqua highlight, complete chart tokens, explicit typography tokens, and consistent surface/border/radius/shadow rules with strong light/dark parity.
2. Create shared `PageShell` and `PageHeader` conventions for protected routes so list/detail/settings pages stop hand-rolling spacing, gradients, and header chrome.
3. Replace ad-hoc controls and raw wrappers with shadcn-first compositions: `Card`, `Table`, `Select`, `Badge`, `Dialog`, `Sheet`, `Alert`, and shared table chrome.
4. Rebuild the login page into a premium SaaS landing/auth surface that preserves Supabase auth behavior while adding AquaDock-specific brand hierarchy, benefit-led copy for marina and hospitality operators, trust signals, and a polished split layout.
5. Roll the unified system across dashboard, lists, detail views, settings, profile, and marketing pages in descending order of inconsistency.

## Brand Direction
- Visual tone: crisp neutrals, fresh aqua and teal accents, light and breathable surfaces, subtle water energy, and enterprise-grade restraint.
- Product framing: position AquaDock as the operational CRM for marinas, hotels, campsites, restaurants, and watersports businesses that need effortless workflows, better visibility, and 24/7 business insight.
- Avoid: heavy oceanic darkness, loud gradients, glassy gimmicks, thick shadows, or startup-style hype copy that feels too consumer.
- Visual restraint: subtle radii, very light shadows, generous whitespace, and breathable surfaces. The product should feel refined and calm, with aqua/teal used as lift rather than decoration.

## Token Strategy
- Core tokens:
  - `--primary`: refined aqua/teal for primary actions and key emphasis.
  - `--accent`: softer aqua highlight for secondary emphasis and active states.
  - `--background`, `--card`, `--muted`, `--border`, `--ring`: clean neutral scale tuned for premium contrast.
  - `--chart-1` through `--chart-5`: dashboard-safe aqua, teal, blue, and supporting neutralized tones.
  - `--success`, `--warning`, `--destructive`: semantic states that feel native to the palette rather than default Tailwind colors.
- Surface rules: subtle radii, light shadows, quiet borders, and no hard-coded brand hex values outside the token layer.

## Login Showcase Brief
- Layout: split-screen or balanced asymmetric layout.
- Left side: hero, short value proposition, and 2-3 operational benefits for sales and marketing managers in waterfront businesses.
- Right side: minimal auth card using shadcn primitives, preserving current Supabase login and recovery behavior.
- Background: subtle water-inspired gradient or texture with generous whitespace, never busy.
- Trust elements: concise proof points, positioning line, or quiet testimonial-style reassurance.
- Copy tone: sophisticated, warm, and professional; functional value first, brand emotion second.
- Suggested headline direction: `Paddle Your Waterfront Business Forward` or `24/7 Operations, Effortless Insights`.
- Suggested benefit framing: streamlined guest management, real-time visibility into rentals and revenue, and automated workflows for marinas, hotels, and campsites.

## Logo Direction
- Do not rely on missing PNG assets.
- Prefer a scalable SVG lockup for both auth and protected shell: clean wordmark plus a simple paddle or wave-inspired mark that works in light and dark mode.
- Keep the mark minimal and geometric so it feels premium and operational rather than playful.

## Highest-Priority Issues
- Semantic tokens exist, but hard-coded aqua, blue, gray, red, emerald, and chart hexes bypass them in many feature files.
- Protected pages share no single shell abstraction, so container width, padding, gradients, header borders, and card density drift by route.
- Reusable components are not visually neutral enough to serve as a unified system; `StatCard`, tables, headers, dialogs, and profile cards each define their own styling language.
- The login page is functional but visually utilitarian, partially English, and still tied to brittle override-heavy Supabase Auth UI presentation.

## Notes
- The repo references `/logo-light.png` and `/logo-dark.png` from the header, but no matching logo assets were found in the workspace scan. Execution should either introduce a scalable SVG logo treatment or define a temporary text-plus-mark lockup for the auth surface and shell.
- Execution remains strictly visual and structural: tokens, classnames, layout composition, and shadcn-first component usage only. No business logic, Supabase flows, server actions, or data-fetching behavior should change.
- Implementation order for execution:
  1. `globals.css` token foundation
  2. shared layout shell files
  3. login page redesign
- File-touch guardrail: only edit files and sections required for the current phase.
- Quality guardrail: after each phase, verify mentally against `pnpm typecheck && pnpm check:fix`, keep zero warnings, avoid `!` and `any`, and preserve all existing hook, auth, and form behavior.