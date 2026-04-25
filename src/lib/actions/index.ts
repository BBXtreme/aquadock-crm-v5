// Barrel: re-exports all domain action modules. Prefer `@/lib/actions/<module>` in app and feature
// code so bundlers need not resolve the full graph; use `@/lib/actions` only where convenient
// (scripts, tests, or a few cross-cutting imports). See docs/folder-conventions.md.

export * from "./auth";
export * from "./brevo";
export * from "./comments";
export * from "./companies";
export * from "./company-enrichment";
export * from "./contact-enrichment";
export * from "./contacts";
export * from "./create-reminder-action";
export * from "./crm-trash";
export * from "./feedback";
export * from "./mass-email";
export * from "./notifications";
export * from "./onboarding";
export * from "./profile";
export * from "./reminders";
export * from "./resolve-detail";
export * from "./semantic-search";
export * from "./settings";
export * from "./timeline";
export * from "./timeline-forms";
export * from "./trash-settings";
export * from "./vercel-ai-credits";
