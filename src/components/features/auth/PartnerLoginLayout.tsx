// src/components/features/auth/PartnerLoginLayout.tsx
//
// Editorial two-column layout for the public partner login. Designed to feel
// nothing like the internal CRM: warm canvas surfaces, ocean accents, generous
// whitespace, with "Paddle. Live. Enjoy." as the hero promise.
//
// All copy is i18n-driven via the `partnerLogin` message namespace.

"use client";

import { ArrowRight, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/use-translations";

interface PartnerLoginLayoutProps {
  children: ReactNode;
}

export function PartnerLoginLayout({ children }: PartnerLoginLayoutProps) {
  const t = useT("partnerLogin");

  return (
    <div className="min-h-screen bg-(--partner-canvas) px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <main className="mx-auto w-full max-w-6xl">
        <section
          className="grid overflow-hidden rounded-3xl border bg-(--partner-canvas-warm,var(--partner-canvas)) md:grid-cols-2"
          style={{ borderColor: "var(--partner-hairline)" }}
        >
          <aside
            className="relative flex flex-col justify-between gap-10 px-6 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14"
            style={{
              background:
                "radial-gradient(120% 80% at 20% 0%, color-mix(in srgb, var(--partner-accent) 16%, transparent), transparent 60%), radial-gradient(140% 80% at 80% 100%, color-mix(in srgb, var(--partner-brand-teal) 14%, transparent), transparent 55%), linear-gradient(180deg, var(--partner-canvas) 0%, var(--partner-canvas-mist) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-10 w-10 place-items-center rounded-full"
                style={{
                  backgroundColor: "var(--partner-accent-soft)",
                  color: "var(--partner-accent)",
                }}
              >
                <PartnerMarkIcon />
              </span>
              <span className="text-sm font-semibold tracking-[0.02em] text-(--partner-ink) sm:text-base">
                Aquadock Partner
              </span>
            </div>

            <div className="space-y-6">
              <p className="text-xs font-bold tracking-[0.2em] text-(--partner-accent) uppercase">
                {t("heroEyebrow")}
              </p>
              <h1 className="max-w-[18ch] text-balance text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.08] tracking-tight text-(--partner-ink)">
                {t("heroTitle")}
              </h1>
              <p className="max-w-prose text-base leading-relaxed text-(--partner-ink-soft) sm:text-lg">
                {t("heroDescription")}
              </p>
              <ul className="space-y-3">
                {(["benefit1", "benefit2", "benefit3"] as const).map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <Shield
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-(--partner-accent)"
                    />
                    <span className="text-sm leading-relaxed text-(--partner-ink) sm:text-base">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm leading-relaxed text-(--partner-ink-soft)">
              {t("trustLine")}
            </p>
          </aside>

          <div className="relative bg-(--partner-card) px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div
              className="mb-6 h-1 w-full rounded-full bg-linear-to-r from-(--partner-accent) via-(--partner-brand-teal) to-(--partner-cta)"
              aria-hidden
            />
            <div className="space-y-4 pb-4 text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-(--partner-ink) sm:text-3xl">
                {t("heroTitleMobile")}
              </h2>
              <a
                href="https://aquadock.de/partner"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--partner-accent) transition-colors hover:text-(--partner-brand-teal)"
              >
                {t("footerLinkBecomePartner")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>

            {children}

            <div className="pt-8">
              <PartnerLoginFooter />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PartnerLoginFooter() {
  const t = useT("partnerLogin");
  return (
    <footer
      className="space-y-3 border-t pt-5 text-sm"
      style={{
        borderColor: "var(--partner-hairline)",
        color: "var(--partner-ink-soft)",
      }}
    >
      <p>{t("footerTagline")}</p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a
          href="https://aquadock.de/kontakt"
          className="underline-offset-4 transition-colors hover:underline"
          style={{ color: "var(--partner-accent)" }}
        >
          {t("footerLinkContact")}
        </a>
        <a
          href="https://aquadock.de/datenschutz"
          className="underline-offset-4 transition-colors hover:underline"
          style={{ color: "var(--partner-accent)" }}
        >
          {t("footerLinkPrivacy")}
        </a>
      </p>
    </footer>
  );
}

function PartnerMarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Aquadock"
    >
      <title>Aquadock</title>
      <path d="M3 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" />
      <path d="M3 13c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" />
      <path d="M12 3l2.5 5L20 9l-4 3.8L17 18l-5-2.7L7 18l1-5.2L4 9l5.5-1z" />
    </svg>
  );
}
