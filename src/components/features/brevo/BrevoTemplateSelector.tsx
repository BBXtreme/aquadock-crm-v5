// src/components/features/brevo/BrevoTemplateSelector.tsx
"use client";

// Dropdown or list from templates prop

import type { Database } from "@/types/database.types";

export default function BrevoTemplateSelector({
  templates,
}: {
  templates: Database["public"]["Tables"]["email_templates"]["Row"][];
}) {
  return <div>Template Selector</div>;
}
