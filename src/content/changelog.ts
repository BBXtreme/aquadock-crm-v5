import { z } from "zod";
import { compareSemver } from "@/lib/changelog/compare-semver";

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
    title: "🚀 SPEED & Klarheit: CRM spürbar schneller, Release Notes im Produkt, Du durchgängig",
    changes: [
      {
        type: "improvement",
        text: "Geschützte Bereiche und Session: schlankere Auth-Kette mit lokalem JWT-Check und einem gebündelten Nutzer-/Profil-Kontext – weniger Warten beim Springen zwischen Dashboard, Listen und Details.",
      },
      {
        type: "improvement",
        text: "Dashboard-Kennzahlen kommen serverseitig vorberechnet (KPI-RPC) statt großer Einzelabfragen – der Überblick für Steg, Rezeption oder Außendienst steht schneller.",
      },
      {
        type: "improvement",
        text: "Unternehmensliste: Filter-Stammdaten und Suche ohne Vollscan der Firmen-Tabelle – Facetten und Liste laden zügiger, besonders wenn viele Betriebe drin sind.",
      },
      {
        type: "improvement",
        text: "Zugriffsregeln in der Datenbank für typische CRM-Abfragen optimiert – ruhigere Performance bei großen Datenmengen im laufenden Betrieb.",
      },
      {
        type: "feature",
        text: "In-App-Changelog mit Timeline, „Was ist neu?“-Spotlight und Kurzweg über Sidebar, Cmd+K sowie Einstellungen – immer im Bild, was sich verbessert hat.",
      },
      {
        type: "improvement",
        text: "Deutsch im CRM konsequent in Du: klarere, persönlichere Texte für Dein Team an Marina, Hotel, Restaurant & Wassersport. Feinschliff an Benachrichtigungs- und Mail-Hinweisen im selben Release (#73–#75).",
      },
    ],
  },
  {
    version: "0.5.45",
    releasedAt: "2026-04-30",
    title: "🔐 Zusammenarbeit & Sicherheit: RLS für echte Teamarbeit",
    changes: [
      {
        type: "security",
        text: "Kollaborative Zugriffsregeln (RLS): Admins/Kern-Policies, konsolidierte Profil- und Einstellungs-Abfragen sowie ausrollbare Härtung nach dem Deploy – inkl. Dokumentation und Prüf-SQL (#78).",
      },
      {
        type: "improvement",
        text: "Kommentare und Anhänge an denselben Besitz- und Sichtbarkeitsregeln ausrichten wie der Rest des CRM – weniger Sonderfälle beim Arbeiten im Team (#78).",
      },
    ],
  },
  {
    version: "0.5.44",
    releasedAt: "2026-04-30",
    title: "🌍 Firmen weltweit einheitlich: ISO-Ländercodes",
    changes: [
      {
        type: "improvement",
        text: "Feld „Land“ für Unternehmen normalisiert auf ISO-3166-1 Alpha-2 (Großbuchstaben oder leer) – Formulare, Import, Filter, Karte und Geocoding ziehen alle am gleichen Strang (#77).",
      },
      {
        type: "improvement",
        text: "Betrieb SQL und Tests ergänzt, damit bestehende Daten bereinigt und neue Einträge konsistent bleiben (#77).",
      },
    ],
  },
  {
    version: "0.5.43",
    releasedAt: "2026-04-28",
    title: "📎 Notizen mit Dateien: Anhänge bei Kommentaren",
    changes: [
      {
        type: "feature",
        text: "Dateianhänge an Firmen-Kommentaren: Upload-Route, Storage-Bucket, Karte im Detail und Lösch-Regeln – praktisch für Angebote, Fotos vom Steg oder Vertrags-PDFs (#76).",
      },
      {
        type: "security",
        text: "Serverseitiger Upload mit klarer RLS; signierte URLs fürs Öffnen und Herunterladen – Zugriff nur, wo das CRM es erlaubt (#76).",
      },
      {
        type: "feature",
        text: "Admin-Opt-in: globale In-App-Übersicht – In-App-Benachrichtigungen für auditierende Admins spiegeln (#71).",
      },
    ],
  },
  {
    version: "0.5.42",
    releasedAt: "2026-04-25",
    title: "🏗️ CSV-Duplikate, Analytics & schlankere Architektur",
    changes: [
      {
        type: "improvement",
        text: "CRM-Code strukturierter: Kontakte, Erinnerungen, Firmen-Detail und große Client-Seiten in klare Feature-Module gelegt – einfacher zu testen und weiterzuentwickeln (#65).",
      },
      {
        type: "feature",
        text: "CSV-Import: Duplikate innerhalb der Datei erkennen, Review-Dialog und KI-gestütztes Zusammenführen – weniger doppelte Marina- oder Hotel-Einträge (#62).",
      },
      {
        type: "improvement",
        text: "Vercel Analytics eingebunden; Benachrichtigungs- und Theme-Schalter sitzen mit dem Profil in einer Header-Gruppe (#63).",
      },
      {
        type: "improvement",
        text: "React, Next, Supabase-Client, React Query und weitere Abhängigkeiten auf gepflegte Stände angehoben (#66–#70).",
      },
      {
        type: "improvement",
        text: "Sonstige Aufräumarbeiten und Kleinfixes im CRM-Code (#64).",
      },
    ],
  },
  {
    version: "0.5.41",
    releasedAt: "2026-04-24",
    title: "🛡️ Dependencies & Schema-Härtung",
    changes: [
      {
        type: "security",
        text: "SQL für Kommentar-Tabellen und Profile ergänzt, RLS-Doku und Deploy-Hinweise angepasst – Fundament für sichere Kommentar-Threads (#61).",
      },
      {
        type: "improvement",
        text: "Next.js, Supabase-JS, next-intl, nodemailer, dompurify u. a. aktualisiert – Sicherheits- und Kompatibilitätsfixes von Upstream (#53, #56, #58–#60).",
      },
    ],
  },
  {
    version: "0.5.40",
    releasedAt: "2026-04-24",
    title: "🔔 In-App-Benachrichtigungen & zweite RLS-Runde",
    changes: [
      {
        type: "feature",
        text: "Eigener Benachrichtigungsbereich: In-App-Feed, Echtzeit-Badge, Reminder-, Timeline- und Kommentar-Ereignisse – damit nichts am Steg oder in der Rezeption untergeht (#43).",
      },
      {
        type: "improvement",
        text: "Kontakt-Zuständigkeit an „created by“ angeglichen inkl. Backfill-Skript; semantische Suche und Firmenliste technisch entzerrt (#43).",
      },
      {
        type: "security",
        text: "Weitere RLS-/Härtungs-Anpassungen (#44) an bestehenden Policies und Dokumentation.",
      },
    ],
  },
  {
    version: "0.5.39",
    releasedAt: "2026-04-21",
    title: "✉️ Interne Notizen, Auth-Flows & Admin-Papierkorb",
    changes: [
      {
        type: "feature",
        text: "Threaded Markdown-Notizen am Unternehmen („Interne Notizen & Diskussionen“) mit Soft-Delete und Markdown-Vorschau (#41).",
      },
      {
        type: "feature",
        text: "Auth: Wiederherstellung und Set-Password, Onboarding-/Zugangsprüfungen für geschützte Routen (#42).",
      },
      {
        type: "improvement",
        text: "Admin-Papierkorb um „Notizen“ erweitert; RLS für gelöschte Kommentare an Timeline/Kontakte angeglichen (#41).",
      },
    ],
  },
  {
    version: "0.5.38",
    releasedAt: "2026-04-20",
    title: "🔎 Semantische Suche: Embeddings, Einstellungen & Backfill",
    changes: [
      {
        type: "feature",
        text: "Einstellungen für Embeddings und semantische Suche in den Account-Einstellungen inkl. Modellpfaden; Backfill-Skript für bestehende Firmen (#40).",
      },
      {
        type: "improvement",
        text: "README, Production-Deploy und Architektur-Doku zum Rollout der Vektorsuche ergänzt (#40).",
      },
      {
        type: "improvement",
        text: "Firmen-Detail, ClientCompaniesPage und Tests an den zweiten Ausbauschritt angepasst (#40).",
      },
    ],
  },
  {
    version: "0.5.37",
    releasedAt: "2026-04-19",
    title: "🔎 Semantische Suche: erste API & hybrid in der Liste",
    changes: [
      {
        type: "feature",
        text: "Neue Route `/api/companies/search` und Anbindung der Firmenliste – hybrid aus Volltext und Vektoren, sobald Embeddings vorliegen (#39).",
      },
      {
        type: "improvement",
        text: "CompaniesTable, Server-Actions und `companies-list-supabase` für die erweiterte Suche verdrahtet; API-Route-Tests ergänzt (#39).",
      },
      {
        type: "improvement",
        text: "Aufräumen von Debug-Artefakten und Aktualisierung des Entwickler-Setups rund um die Suche (#39).",
      },
    ],
  },
  {
    version: "0.5.36",
    releasedAt: "2026-04-17",
    title: "📊 Listen & Details: Filter in der URL, Kontakte am Betrieb",
    changes: [
      {
        type: "feature",
        text: "Filter- und Spaltenzustand für Unternehmen und Kontakte in der Adresszeile gespeichert – teilbare Links, Zurück-Navigation wie erwartet (#38).",
      },
      {
        type: "improvement",
        text: "Verknüpfte Kontakte und Karten auf der Firmen-Detailseite ausgebaut; Tabellen und Tests für konsistente Bulk-/Lösch-Flows (#38).",
      },
    ],
  },
  {
    version: "0.5.35",
    releasedAt: "2026-04-16",
    title: "📍 Geocoding beim Import: Koordinaten mit Nominatim prüfen",
    changes: [
      {
        type: "feature",
        text: "CSV-Import mit Geocoding-Review: Nominatim-Anbindung, Fortschritt und Modal zur Auswahl – Liegeplätze und Betriebe landen richtig auf der Karte (#35).",
      },
      {
        type: "improvement",
        text: "Timeline-Badges und AquaDock-Karte am Detail angepasst; Zusatz-SQL für aus dem Range fallende Lat/Lon (#35).",
      },
    ],
  },
  {
    version: "0.5.34",
    releasedAt: "2026-04-16",
    title: "🎨 Design-System: PageShell, Login, Dashboard",
    changes: [
      {
        type: "improvement",
        text: "Einheitliches Layout mit PageShell, aktualisierte Theme-Tokens (Erfolg, Warnung, Destructive) und konsistentere Komponenten (#33).",
      },
      {
        type: "improvement",
        text: "Login mit klarer Hero-Seite; Dashboard-Bedienung und Badges an das neue Erscheinungsbild angepasst (#33).",
      },
    ],
  },
  {
    version: "0.5.33",
    releasedAt: "2026-04-12",
    title: "🤖 KI-Anreicherung: Modelle, Limits & Dialog",
    changes: [
      {
        type: "feature",
        text: "Einstellungen für KI-Anreicherung vereinfacht: Modellwahl, Rate-Limits und Kosten-Hinweis im Dialog (#31).",
      },
      {
        type: "improvement",
        text: "KI-Dialog und Web-Suche poliert; Abbruch während laufender Anfrage möglich (#31).",
      },
    ],
  },
  {
    version: "0.5.32",
    releasedAt: "2026-04-10",
    title: "🔑 Session & Login robuster, dunkles Login",
    changes: [
      {
        type: "fix",
        text: "Auth-Session und Recovery-Pfade gehärtet; Vitest-Abdeckung für Auth-Caches erweitert (#28).",
      },
      {
        type: "improvement",
        text: "Login-Oberfläche für Dark Mode verfeinert (#28).",
      },
    ],
  },
  {
    version: "0.5.31",
    releasedAt: "2026-04-10",
    title: "🗑️ Papierkorb & Qualität: Vitest + Playwright",
    changes: [
      {
        type: "feature",
        text: "Papierkorb für CRM-Daten (Soft-Delete) mit Wiederherstellung durch Admins – weniger Angst vor dem falschen Klick (#23).",
      },
      {
        type: "improvement",
        text: "Vitest- und Playwright-Setup ausgebaut (u. a. Reset-Flows, CI-taugliche Timeouts) (#25).",
      },
    ],
  },
  {
    version: "0.5.30",
    releasedAt: "2026-04-08",
    title: "🌐 Mehrsprachigkeit, Zeitzone & OpenMap-Feinschliff",
    changes: [
      {
        type: "feature",
        text: "UI und Inhalte stark Richtung Mehrsprachigkeit (DE/EN/HR) erweitert; Zeitzonen-Auswahl in den Einstellungen (#22).",
      },
      {
        type: "fix",
        text: "Popups und Marker in der OpenMap-Ansicht stabiler und konsistenter (#22).",
      },
    ],
  },
  {
    version: "0.5.29",
    releasedAt: "2026-04-07",
    title: "🧰 Lockfile & Workspace aufgeräumt",
    changes: [
      {
        type: "improvement",
        text: "pnpm-Workspace und Abhängigkeiten verschlankt – weniger Rauschen in `pnpm-lock.yaml`, klarere lokale Tooling-Pfade (#20).",
      },
      {
        type: "improvement",
        text: "Kleinere Package-Anpassungen rund um den Supabase-Client (#21 „Picture“).",
      },
    ],
  },
  {
    version: "0.5.28",
    releasedAt: "2026-04-07",
    title: "🔔 Benachrichtigungen: erster Aufbau",
    changes: [
      {
        type: "feature",
        text: "Grundlagen für In-App-Benachrichtigungen: Platzhalter-Seiten, Skeleton und Navigation – Vorläufer zum vollen Feed (#19).",
      },
    ],
  },
  {
    version: "0.5.27",
    releasedAt: "2026-04-06",
    title: "✉️ Brevo angebunden: Kampagnen aus dem CRM",
    changes: [
      {
        type: "feature",
        text: "Brevo-E-Mail-Kampagnen: Einstellungen in den Account-Einstellungen, UI-Flows zum Starten von Kampagnen (#17).",
      },
      {
        type: "improvement",
        text: "Imports und Brevo-bezogene Routen technisch vorbereitet und dokumentiert (#17).",
      },
    ],
  },
  {
    version: "0.5.26",
    releasedAt: "2026-04-05",
    title: "🏷️ Sidebar: Version sichtbar, Karte poliert",
    changes: [
      {
        type: "improvement",
        text: "Sidebar zeigt die App-Version aus `package.json`; OSM-Link im Karten-Popup nutzt eine vollständige URL (#16).",
      },
    ],
  },
  {
    version: "0.5.25",
    releasedAt: "2026-04-04",
    title: "🏷️ Alpha-Feinschliff: Version & Links",
    changes: [
      {
        type: "improvement",
        text: "Version in der Sidebar und konsistente externe Karten-Links (#14).",
      },
    ],
  },
  {
    version: "0.5.24",
    releasedAt: "2026-04-04",
    title: "📌 Release V24 (intern)",
    changes: [
      {
        type: "improvement",
        text: "Interner Meilenstein „V24“: Abstimmung von Tooling und Versionsständen ohne große sichtbare Produkt-UI (kein PR im Merge-Commit).",
      },
    ],
  },
  {
    version: "0.5.23",
    releasedAt: "2026-04-04",
    title: "🗄️ Schema & Admin-Mailpfad",
    changes: [
      {
        type: "improvement",
        text: "Supabase-Schema-Doku erweitert (u. a. Zod/Auth); Datenbank- und Aufräum-Arbeiten („Db2“, #13).",
      },
      {
        type: "feature",
        text: "Admin-Client mit Service-Role für Profil-Aktionen und zuverlässigere User-Listen im Profil-Bereich (#12).",
      },
    ],
  },
  {
    version: "0.5.22",
    releasedAt: "2026-03-31",
    title: "🔢 Versions-Anzeige vereinheitlicht",
    changes: [
      {
        type: "improvement",
        text: "Zentrale Versionskonstante in `src/lib/version.ts` mit `package.json` abgeglichen („version 22“, ohne PR-Nummer im Commit).",
      },
    ],
  },
  {
    version: "0.5.21",
    releasedAt: "2026-03-31",
    title: "🔐 Auth & geschütztes CRM, CSV-Import startet",
    changes: [
      {
        type: "feature",
        text: "Login und Session: geschützte Routen (Dashboard, Firmen, Kontakte, OpenMap, …), Profil mit Anzeigenamen und Admin-Nutzerverwaltung, Sidebar mit Rolle und Schnellaktionen (#11).",
      },
      {
        type: "feature",
        text: "CSV-Import-Utilities für Unternehmensdaten inkl. Validierung und Aufräumen technischer Kanten (#10).",
      },
      {
        type: "improvement",
        text: "OpenMap-Popup (OSM) optisch an Firmen-Popup angeglichen; überzähligen „Wasserinfo“-Button entfernt (#11).",
      },
    ],
  },
  {
    version: "0.5.20",
    releasedAt: "2026-03-28",
    title: "💧 OpenMap: Wasser & Distanz am POI",
    changes: [
      {
        type: "feature",
        text: "Wasser-/Distanz-Logik im OSM-POI-Popup verbessert (Abfrage, Jitter, Fallback) – bessere Orientierung am Liegeplatz (#9).",
      },
      {
        type: "improvement",
        text: "Chores: Import-Reihenfolge, Quotes/Biome – stabilerer Stand für den nächsten Feature-Block (#9).",
      },
    ],
  },
  {
    version: "0.5.19",
    releasedAt: "2026-03-27",
    title: "⚓ Firmen & Karte: OpenMap-Import ohne harten Reload",
    changes: [
      {
        type: "improvement",
        text: "Nach OSM-POI-Import weiche Aktualisierung der Firmenliste – schnellerer Arbeitsfluss an der Marina (#6).",
      },
      {
        type: "improvement",
        text: "Qualität: Husky + Biome Pre-Commit, Projekt-Hygiene für stabile Builds (#6).",
      },
    ],
  },
  {
    version: "0.1.0",
    releasedAt: "2026-03-21",
    title: "🧱 AquaDock CRM v5: Fundament & Techstack",
    changes: [
      {
        type: "improvement",
        text: "Greenfield mit Next.js App Router, TypeScript, Tailwind und Biome; projektfeste Struktur und Vercel-taugliche Basis (#4).",
      },
      {
        type: "feature",
        text: "Supabase angebunden (Client, Typen), erste geschützte App-Shell und Auth-/Profil-Pfade vorbereitet (Bootstrap vor #4).",
      },
      {
        type: "improvement",
        text: "Editor-Regeln, Globals und Package-Pflege bis zum ersten stabilen Entwickler-Alltag; Husky-Vorbereitung (Bootstrap vor #4).",
      },
      {
        type: "fix",
        text: "Initiale Dependency- und Build-Fixes (inkl. Turbopack/TS) aus den ersten Repository-Tagen zusammengeführt (Bootstrap vor #4).",
      },
    ],
  },
];

export const changelogEntries: ChangelogRelease[] = changelogEntriesSchema.parse(rawChangelogEntries);

/**
 * Newest-first: sort by `releasedAt` (ISO dates sort lexicographically), then by semver
 * descending when the calendar day matches (same-day version bumps stay in patch order).
 */
function sortNewestFirst(entries: ChangelogRelease[]): ChangelogRelease[] {
  return [...entries].sort((a, b) => {
    if (a.releasedAt > b.releasedAt) {
      return -1;
    }
    if (a.releasedAt < b.releasedAt) {
      return 1;
    }
    const semverCmp = compareSemver(a.version, b.version);
    if (semverCmp === null) {
      return 0;
    }
    if (semverCmp === 1) {
      return -1;
    }
    if (semverCmp === -1) {
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
