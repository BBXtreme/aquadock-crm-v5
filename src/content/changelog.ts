import { z } from "zod";

/** Shared with `ChangelogSpotlight` and sidebar unread indicator. */
export const CHANGELOG_LAST_SEEN_STORAGE_KEY = "aquadock_changelog_last_seen";

/** Fired on the window after `CHANGELOG_LAST_SEEN_STORAGE_KEY` is updated (same-tab sidebar refresh). */
export const CHANGELOG_SEEN_EVENT = "aquadock_changelog_seen";

export const changelogChangeTypeSchema = z.enum(["feature", "fix", "improvement", "security"]);

export const changelogReleaseSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/u, "version must be major.minor.patch"),
    releasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "releasedAt must be YYYY-MM-DD"),
    title: z.string().min(1),
    changes: z
      .array(
        z
          .object({
            type: changelogChangeTypeSchema,
            text: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();

export type ChangelogRelease = z.infer<typeof changelogReleaseSchema>;

const changelogEntriesSchema = z.array(changelogReleaseSchema).min(1);

const rawChangelogEntries: ChangelogRelease[] = [
  {
    version: "0.5.46",
    releasedAt: "2026-05-01",
    title: "🚀 Der neue In-App Changelog – Du siehst sofort, was sich verbessert hat",
    changes: [
      {
        type: "feature",
        text: "Schöner, übersichtlicher Changelog mit allen Versionen und klaren Vorteilen für Deinen Alltag",
      },
      {
        type: "feature",
        text: "Intelligenter „Was ist neu?“-Spotlight – erscheint automatisch nach Versions-Updates und zeigt die wichtigsten Neuerungen",
      },
      {
        type: "improvement",
        text: "Direkter Zugriff über Sidebar, Command Palette (Cmd+K) und Einstellungen – immer nur einen Klick entfernt",
      },
      {
        type: "improvement",
        text: "Semver-Vergleich und persistenter „Gesehen“-Status für eine saubere, unaufdringliche Nutzung",
      },
    ],
  },
  {
    version: "0.5.30",
    releasedAt: "2026-04-15",
    title: "⚡ OpenMap & Pipeline: schneller entscheiden, wo es langgeht",
    changes: [
      {
        type: "improvement",
        text: "OpenMap lädt flotter und gruppiert Liegeplätze und POIs klarer – perfekt für einen schnellen Überblick über Deine Marina oder den Wassersport-Standort.",
      },
      {
        type: "feature",
        text: "Filter und Ansichten in der Unternehmensliste sparen Klicks: Fokus auf die Betriebe, die heute wirklich zählen.",
      },
      {
        type: "fix",
        text: "Stabilere Erinnerungen und Timeline-Einträge, damit nichts zwischen Wassersportkurs und Check-in untergeht.",
      },
    ],
  },
  {
    version: "0.5.12",
    releasedAt: "2026-03-20",
    title: "🚀 Kontakte & KI: reibungsloser vom ersten Hallo bis zur Buchung",
    changes: [
      {
        type: "improvement",
        text: "AI-Anreicherung von Firmendaten mit klarerem Feedback – weniger Rätselraten bei neuen Gastronomie- oder Hotel-Leads.",
      },
      {
        type: "feature",
        text: "Kontakte und Verantwortliche sind noch besser mit Unternehmen verknüpft – Dein Team arbeitet aus einer gemeinsamen Wahrheit.",
      },
      {
        type: "security",
        text: "Feinjustierung der Zugriffsregeln: Jeder sieht, was er braucht – ohne interne Details nach außen zu tragen.",
      },
    ],
  },
];

export const changelogEntries: ChangelogRelease[] = changelogEntriesSchema.parse(rawChangelogEntries);

/** Newest-first source order; defensive sort by `releasedAt` (ISO dates sort lexicographically). */
function sortNewestFirst(entries: ChangelogRelease[]): ChangelogRelease[] {
  return [...entries].sort((a, b) => {
    if (a.releasedAt > b.releasedAt) {
      return -1;
    }
    if (a.releasedAt < b.releasedAt) {
      return 1;
    }
    return 0;
  });
}

/** Newest first — for the full history page. */
export function getChangelogEntriesSorted(): ChangelogRelease[] {
  return sortNewestFirst(changelogEntries);
}

export function getLatestRelease(): ChangelogRelease {
  const sorted = sortNewestFirst(changelogEntries);
  const first = sorted[0];
  if (first === undefined) {
    throw new Error("changelogEntries must not be empty");
  }
  return first;
}
