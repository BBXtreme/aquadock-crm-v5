// src/components/ui/contact-avatar.tsx
// Deterministic initials avatar for contacts. The same person always maps to
// the same tone from the palette below, so the table reads as "Leopold is
// always the violet one, Sabine is always the blue one" — much more scannable
// than plain text. Palette is intentionally muted (100/700 tints) so the
// avatars support the row, they don't compete with it.

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// 8 muted tones, light-mode tint + dark-mode override paired together.
// Each string is a complete set of utility classes so Tailwind's JIT can pick
// them up statically — don't compose these dynamically.
const PALETTE = [
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200",
] as const;

function hashString(input: string): number {
  // djb2-ish — good enough distribution across 8 buckets for a few thousand
  // contacts and it's trivially cheap to compute per row.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getInitials(vorname?: string | null, nachname?: string | null): string {
  const v = (vorname ?? "").trim();
  const n = (nachname ?? "").trim();
  if (!v && !n) return "?";
  const first = v ? v[0] : "";
  const second = n ? n[0] : v.length > 1 ? v[1] : "";
  return (first + second).toUpperCase();
}

interface ContactAvatarProps {
  vorname?: string | null;
  nachname?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ContactAvatar({ vorname, nachname, size = "sm", className }: ContactAvatarProps) {
  const initials = getInitials(vorname, nachname);
  const key = `${(vorname ?? "").trim().toLowerCase()} ${(nachname ?? "").trim().toLowerCase()}`;
  const tone = PALETTE[hashString(key) % PALETTE.length];

  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className={cn("font-medium", tone)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
