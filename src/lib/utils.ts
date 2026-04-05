// src/lib/utils.ts
// Utility functions for general use across the app
// This file includes functions for class name merging, label mapping, and formatting
// The functions in this file are designed to be reusable and help keep
// the codebase clean and consistent
// The `cn` function is a utility for merging class names using clsx and tailwind-merge
// The label mapping functions convert internal values to user-friendly
// labels with emojis for better UX
// The `formatDateDE` function formats dates in the German locale
// The `safeDisplay` function ensures that null or undefined values are displayed as a placeholder
// instead of causing errors or showing "null"/"undefined" in the UI

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  countryFlags,
  firmentypLabels,
  kundentypLabels,
  priorityLabels,
  reminderStatusLabels,
  statusLabels,
} from "@/lib/constants/company-lables";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getKundentypLabel(t: string): string {
  return kundentypLabels[t.toLowerCase()] || t;
}

export function getStatusLabel(status: string): string {
  return statusLabels[status.toLowerCase()] || status;
}

export function getFirmentypLabel(firmentyp: string): string {
  return firmentypLabels[firmentyp.toLowerCase()] || firmentyp;
}

export function getCountryFlag(country: string | null): string | null {
  return country ? countryFlags[country] || "🏳️" : null;
}

export function getPriorityLabel(p: string | null | undefined): string {
  return priorityLabels[p?.toLowerCase() || ""] || p || "—";
}

export function getReminderStatusLabel(s: string | null | undefined): string {
  return reminderStatusLabels[s?.toLowerCase() || ""] || s || "—";
}

export function formatDateDE(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function safeDisplay(value: unknown): string {
  if (value == null) return "—";
  return String(value);
}
