// src/components/features/brevo/BrevoTemplateSelector.tsx
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n/use-translations";
import type { Database } from "@/types/database.types";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];

interface BrevoTemplateSelectorProps {
  templates: EmailTemplate[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function BrevoTemplateSelector({
  templates,
  value,
  onChange,
  placeholder,
}: BrevoTemplateSelectorProps) {
  const t = useT("brevo");
  const resolvedPlaceholder = placeholder ?? t("templateSelectorPlaceholder");
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={resolvedPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
