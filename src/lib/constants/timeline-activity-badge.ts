import { cn } from "@/lib/utils";

/**
 * Glass-style activity badges for the timeline: distinct hues, backdrop blur, soft inner highlight.
 * Used by the global timeline table and company detail timeline card only.
 */
const glassShell =
  "min-h-[1.375rem] border px-2.5 py-0.5 text-xs font-medium shadow-sm backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,filter,background-color,border-color] duration-200 hover:brightness-[1.04] dark:hover:brightness-110 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-current [&_svg]:opacity-95 [&_svg]:[stroke:currentColor]";

const glassHighlight =
  "shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.22)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/**
 * Light: deep hue ink (950) for readable labels on pale frosted chips.
 * Dark: ~100 tints on glass.
 */
const styles: Record<string, string> = {
  call: cn(
    "border-sky-400/40 bg-gradient-to-br from-sky-400/25 via-sky-500/12 to-cyan-500/10 !text-sky-950",
    "dark:border-sky-400/35 dark:from-sky-400/20 dark:via-sky-500/10 dark:to-cyan-500/8 dark:!text-sky-100",
  ),
  email: cn(
    "border-violet-400/40 bg-gradient-to-br from-violet-400/22 via-indigo-400/12 to-indigo-600/10 !text-violet-950",
    "dark:border-violet-400/32 dark:from-violet-400/18 dark:via-indigo-500/10 dark:to-indigo-700/8 dark:!text-violet-100",
  ),
  meeting: cn(
    "border-amber-400/45 bg-gradient-to-br from-amber-400/28 via-orange-400/14 to-rose-400/10 !text-amber-950",
    "dark:border-amber-400/35 dark:from-amber-400/18 dark:via-orange-400/12 dark:to-rose-500/8 dark:!text-amber-100",
  ),
  import: cn(
    "border-emerald-400/40 bg-gradient-to-br from-emerald-400/24 via-teal-400/14 to-cyan-600/10 !text-emerald-950",
    "dark:border-emerald-400/32 dark:from-emerald-400/18 dark:via-teal-500/10 dark:to-cyan-700/8 dark:!text-emerald-100",
  ),
  deleted: cn(
    "border-rose-400/40 bg-gradient-to-br from-rose-400/20 via-rose-500/12 to-red-500/8 !text-rose-950",
    "dark:border-rose-500/32 dark:from-rose-500/16 dark:via-red-500/10 dark:to-red-900/12 dark:!text-rose-100",
  ),
  ai_enrichment: cn(
    "border-fuchsia-400/38 bg-gradient-to-br from-fuchsia-400/20 via-violet-500/14 to-purple-600/12 !text-purple-950",
    "dark:border-fuchsia-500/32 dark:from-fuchsia-500/16 dark:via-violet-500/12 dark:to-purple-800/14 dark:!text-fuchsia-100",
  ),
  note: cn(
    "border-blue-300/45 bg-gradient-to-br from-blue-400/18 via-slate-400/10 to-slate-500/8 !text-blue-950",
    "dark:border-blue-500/28 dark:from-blue-500/14 dark:via-slate-500/10 dark:to-slate-700/12 dark:!text-blue-100",
  ),
  other: cn(
    "border-slate-400/35 bg-gradient-to-br from-slate-400/16 via-zinc-400/10 to-zinc-500/8 !text-slate-900",
    "dark:border-slate-500/30 dark:from-slate-500/14 dark:via-zinc-600/10 dark:to-zinc-800/12 dark:!text-slate-100",
  ),
};

export function timelineActivityBadgeClassName(displayType: string): string {
  return cn(glassShell, glassHighlight, styles[displayType] ?? styles.other);
}
