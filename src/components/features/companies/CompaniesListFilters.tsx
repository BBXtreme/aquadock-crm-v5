"use client";

import { Waves, X } from "lucide-react";
import { useLocale } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { WATER_PRESETS, type WaterPreset } from "@/components/features/companies/client-companies-constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kategorieIcons, statusIcons } from "@/lib/constants/company-icons";
import { firmentypOptions, kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { wassertypOptions } from "@/lib/constants/wassertyp";
import { getLandFlagEmoji, getLandRegionDisplayName, normalizeLandInput } from "@/lib/countries/iso-land";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import type {
  CompaniesFilterGroup,
} from "@/lib/utils/company-filters-url-state";

type DistinctFilterValues = {
  status: Set<string>;
  kundentyp: Set<string>;
  firmentyp: Set<string>;
  land: Set<string>;
  wassertyp: Set<string>;
};

function LandFilterFace({ code, locale }: { code: string; locale: string }) {
  const n = normalizeLandInput(code);
  const emoji = n.ok ? getLandFlagEmoji(n.code) : null;
  return (
    <span className="inline-flex items-center gap-1">
      {emoji !== null ? <span aria-hidden>{emoji}</span> : null}
      <span>{getLandRegionDisplayName(code, locale)}</span>
    </span>
  );
}

type CompaniesListFiltersProps = {
  total: number;
  activeFilters: Record<CompaniesFilterGroup, string[]>;
  waterFilter: WaterPreset | null;
  distinctFilterValues: DistinctFilterValues | undefined;
  distinctLands: string[];
  accordionOpen: boolean;
  setAccordionOpen: (open: boolean) => void;
  setPagination: Dispatch<SetStateAction<{ pageIndex: number; pageSize: number }>>;
  removeFilter: (group: CompaniesFilterGroup, value: string) => void;
  toggleFilter: (group: CompaniesFilterGroup, value: string) => void;
  setActiveFilters: Dispatch<SetStateAction<Record<CompaniesFilterGroup, string[]>>>;
  setWaterFilter: Dispatch<SetStateAction<WaterPreset | null>>;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
};

export function CompaniesListFilters({
  total,
  activeFilters,
  waterFilter,
  distinctFilterValues,
  distinctLands,
  accordionOpen,
  setAccordionOpen,
  setPagination,
  removeFilter,
  toggleFilter,
  setActiveFilters,
  setWaterFilter,
  setGlobalFilter,
}: CompaniesListFiltersProps) {
  const t = useT("companies");
  const locale = useLocale();
  const totalActiveFilters = Object.values(activeFilters).flat().length + (waterFilter ? 1 : 0);
  const waterPreset = waterFilter ? WATER_PRESETS.find((p) => p.value === waterFilter) : null;

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap gap-2 items-center",
          totalActiveFilters === 0 ? "mt-1" : "mt-4",
        )}
      >
        {Object.entries(activeFilters).map(([group, values]) =>
          values.map((v) => (
            <Badge key={`${group}-${v}`} variant="secondary" className="flex items-center gap-1">
              {group === "land" ? <LandFilterFace code={v} locale={locale} /> : v}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter(group as CompaniesFilterGroup, v)}
              />
            </Badge>
          )),
        )}
        {waterPreset && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Waves className="h-3 w-3" />
            {t(waterPreset.labelKey)}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => {
                setPagination((p) => ({ ...p, pageIndex: 0 }));
                setWaterFilter(null);
              }}
            />
          </Badge>
        )}
        {totalActiveFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPagination((p) => ({ ...p, pageIndex: 0 }));
              setActiveFilters({
                status: [],
                kategorie: [],
                betriebstyp: [],
                land: [],
                wassertyp: [],
              });
              setWaterFilter(null);
              setGlobalFilter("");
            }}
          >
            {t("clearAllFilters")}
          </Button>
        )}
      </div>

      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem>
          <AccordionTrigger open={accordionOpen} setOpen={setAccordionOpen}>
            {(() => {
              const count = Object.values(activeFilters).flat().length + (waterFilter ? 1 : 0);
              return count > 0 ? t("filtersWithCount", { count, total }) : t("filters");
            })()}
          </AccordionTrigger>
          <AccordionContent open={accordionOpen} setOpen={setAccordionOpen}>
            <div className="mb-4">
              <h4 className="font-normal mb-2">{t("filterStatus")}</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions
                  .filter(
                    (o) =>
                      !distinctFilterValues ||
                      distinctFilterValues.status.has(o.value) ||
                      activeFilters.status.includes(o.value),
                  )
                  .map((option) => {
                    const Icon = statusIcons[option.value];
                    const isActive = activeFilters.status.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={
                          isActive
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        }
                        onClick={() => toggleFilter("status", option.value)}
                      >
                        {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                        {option.label}
                      </Button>
                    );
                  })}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-normal mb-2">{t("filterCategory")}</h4>
              <div className="flex flex-wrap gap-2">
                {kundentypOptions
                  .filter(
                    (o) =>
                      !distinctFilterValues ||
                      distinctFilterValues.kundentyp.has(o.value) ||
                      activeFilters.kategorie.includes(o.value),
                  )
                  .map((option) => {
                    const Icon = kategorieIcons[option.value];
                    const isActive = activeFilters.kategorie.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={
                          isActive
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        }
                        onClick={() => toggleFilter("kategorie", option.value)}
                      >
                        {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                        {option.label}
                      </Button>
                    );
                  })}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-normal mb-2">{t("filterBusinessType")}</h4>
              <div className="flex flex-wrap gap-2">
                {firmentypOptions
                  .filter(
                    (o) =>
                      !distinctFilterValues ||
                      distinctFilterValues.firmentyp.has(o.value) ||
                      activeFilters.betriebstyp.includes(o.value),
                  )
                  .map((option) => {
                    const isActive = activeFilters.betriebstyp.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={
                          isActive
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        }
                        onClick={() => toggleFilter("betriebstyp", option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-normal mb-2">{t("filterWater")}</h4>
              <div className="flex flex-wrap gap-2">
                {WATER_PRESETS.map((preset) => {
                  const isActive = waterFilter === preset.value;
                  return (
                    <Button
                      key={preset.value}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={
                        isActive
                          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }
                      onClick={() => {
                        setPagination((p) => ({ ...p, pageIndex: 0 }));
                        setWaterFilter(isActive ? null : preset.value);
                      }}
                    >
                      <Waves className="mr-1.5 h-3.5 w-3.5" />
                      {t(preset.labelKey)}
                    </Button>
                  );
                })}
                {wassertypOptions
                  .filter(
                    (o) =>
                      !distinctFilterValues ||
                      distinctFilterValues.wassertyp.has(o.value) ||
                      activeFilters.wassertyp.includes(o.value),
                  )
                  .map((option) => {
                    const isActive = activeFilters.wassertyp.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={
                          isActive
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        }
                        onClick={() => toggleFilter("wassertyp", option.value)}
                      >
                        <Waves className="mr-1.5 h-3.5 w-3.5" />
                        {option.label}
                      </Button>
                    );
                  })}
              </div>
            </div>

            <div>
              <h4 className="font-normal mb-2">{t("filterCountry")}</h4>
              <div className="flex flex-wrap gap-2">
                {distinctLands.map((land) => {
                  const isActive = activeFilters.land.includes(land);
                  return (
                    <Button
                      key={land}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={
                        isActive
                          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }
                      onClick={() => toggleFilter("land", land)}
                    >
                      <LandFilterFace code={land} locale={locale} />
                    </Button>
                  );
                })}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
