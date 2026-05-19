"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/use-translations";
import {
  computePdfPageSlices,
  createStandortanalysePdfFilename,
} from "@/lib/standortanalyse/standortanalyse-pdf-export";

const HTML2CANVAS_OPTIONS = {
  scale: 2,
  useCORS: true,
  logging: false,
} as const;

const BRAND_INK = [15, 23, 42] as const;
const BRAND_MUTED = [71, 85, 105] as const;
const BRAND_ACCENT = [14, 116, 144] as const;
const BRAND_DIVIDER = [203, 213, 225] as const;

async function waitForRender(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 300));
}

function createAquadockLogoDataUrl(): string {
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 320;
  logoCanvas.height = 72;
  const ctx = logoCanvas.getContext("2d");
  if (ctx == null) {
    return "";
  }

  ctx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(10, 46);
  ctx.bezierCurveTo(24, 36, 38, 56, 52, 46);
  ctx.bezierCurveTo(66, 36, 80, 56, 94, 46);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, 56);
  ctx.bezierCurveTo(24, 46, 38, 66, 52, 56);
  ctx.bezierCurveTo(66, 46, 80, 66, 94, 56);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial";
  ctx.fillText("AquaDock", 108, 50);
  ctx.fillStyle = "#334155";
  ctx.font = "500 16px Arial";
  ctx.fillText("CRM Standortanalyse", 110, 67);

  return logoCanvas.toDataURL("image/png");
}

export function useStandortanalyseReportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const t = useT("standortanalyse");

  const downloadPdf = useCallback(
    async (
      reportElement: HTMLElement,
      meta: { ort: string; analysisId: string | null; standortAdresse: string },
    ) => {
      setIsExporting(true);
      const htmlRoot = document.documentElement;
      const rootWasDark = htmlRoot.classList.contains("dark");
      if (rootWasDark) {
        htmlRoot.classList.remove("dark");
      }
      try {
        await waitForRender();
        const { default: html2canvas } = await import("html2canvas-pro");
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(reportElement, HTML2CANVAS_OPTIONS);
        const pageWidthMm = 210;
        const pageHeightMm = 297;
        const sideMarginMm = 12;
        const headerHeightMm = 24;
        const footerHeightMm = 20;
        const contentTopMm = sideMarginMm + headerHeightMm;
        const contentBottomMm = sideMarginMm + footerHeightMm;
        const usableWidthMm = pageWidthMm - sideMarginMm * 2;
        const usableHeightMm = pageHeightMm - contentTopMm - contentBottomMm;
        const slices = computePdfPageSlices({
          canvasWidthPx: canvas.width,
          canvasHeightPx: canvas.height,
          pageWidthMm,
          pageHeightMm,
          contentWidthMm: usableWidthMm,
          contentHeightMm: usableHeightMm,
        });

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const tempCanvas = document.createElement("canvas");
        const tempContext = tempCanvas.getContext("2d");
        if (tempContext == null) {
          throw new Error("Canvas context unavailable");
        }

        const logoDataUrl = createAquadockLogoDataUrl();
        const generatedAt = new Date().toLocaleString("de-DE");
        const totalPages = slices.length;
        const analysisLabel = meta.analysisId != null ? `Analyse ${meta.analysisId.slice(0, 8)}` : "Analyse Entwurf";
        const standortLabel = meta.standortAdresse.trim() !== "" ? meta.standortAdresse : "Standort nicht angegeben";
        const footerInfoLeft = "AquaDock CRM";
        const footerInfoCenter = "www.aquadock.de · kontakt@aquadock.de · Impressum: aquadock.de/impressum";

        for (const [index, slice] of slices.entries()) {
          const isFirstPage = index === 0;
          tempCanvas.width = canvas.width;
          tempCanvas.height = Math.max(1, Math.round(slice.sourceHeight));
          tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempContext.drawImage(
            canvas,
            0,
            slice.sourceY,
            canvas.width,
            slice.sourceHeight,
            0,
            0,
            canvas.width,
            tempCanvas.height,
          );
          const imageData = tempCanvas.toDataURL("image/png");
          if (index > 0) {
            pdf.addPage();
          }

          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidthMm, pageHeightMm, "F");

          if (logoDataUrl !== "") {
            pdf.addImage(logoDataUrl, "PNG", sideMarginMm, isFirstPage ? 6 : 7, isFirstPage ? 64 : 58, isFirstPage ? 14 : 12.8);
          } else {
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...BRAND_INK);
            pdf.setFontSize(isFirstPage ? 15 : 14);
            pdf.text("AquaDock", sideMarginMm, isFirstPage ? 14 : 14.5);
          }

          pdf.setFillColor(...BRAND_ACCENT);
          pdf.rect(sideMarginMm, 22.2, pageWidthMm - sideMarginMm * 2, 0.8, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(isFirstPage ? 12.4 : 10.5);
          pdf.setTextColor(...BRAND_INK);
          pdf.text("Standortanalyse Report", pageWidthMm - sideMarginMm, isFirstPage ? 11.8 : 11.6, { align: "right" });
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(isFirstPage ? 9.3 : 8.6);
          pdf.setTextColor(...BRAND_MUTED);
          pdf.text(`${analysisLabel} · ${meta.ort}`, pageWidthMm - sideMarginMm, isFirstPage ? 16.8 : 16.2, { align: "right" });
          pdf.setDrawColor(...BRAND_DIVIDER);
          pdf.line(sideMarginMm, 24.6, pageWidthMm - sideMarginMm, 24.6);

          if (isFirstPage) {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...BRAND_MUTED);
            pdf.setFontSize(8.6);
            pdf.text(
              "Entscheidungsgrundlage fuer Standortfreigabe, Priorisierung und naechste Schritte.",
              sideMarginMm,
              28.8,
            );
          }

          pdf.addImage(imageData, "PNG", sideMarginMm, contentTopMm, usableWidthMm, slice.targetHeightMm);

          pdf.setDrawColor(...BRAND_DIVIDER);
          pdf.line(sideMarginMm, pageHeightMm - contentBottomMm + 5, pageWidthMm - sideMarginMm, pageHeightMm - contentBottomMm + 5);

          if (isFirstPage) {
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...BRAND_INK);
            pdf.setFontSize(8.8);
            pdf.text(footerInfoLeft, sideMarginMm, pageHeightMm - 10.8);

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...BRAND_MUTED);
            pdf.setFontSize(8.1);
            pdf.text(footerInfoCenter, sideMarginMm, pageHeightMm - 7.1);
            pdf.text(`Standort: ${standortLabel}`, sideMarginMm, pageHeightMm - 3.3);
            pdf.text(`Erstellt am: ${generatedAt}`, sideMarginMm, pageHeightMm - 1.1);
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...BRAND_MUTED);
            pdf.setFontSize(7.8);
            pdf.text(footerInfoCenter, sideMarginMm, pageHeightMm - 5.8);
            pdf.text(`Standort: ${standortLabel}`, sideMarginMm, pageHeightMm - 2.1);
          }

          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...BRAND_INK);
          pdf.setFontSize(8.8);
          pdf.text(
            `Seite ${index + 1} / ${totalPages}`,
            pageWidthMm - sideMarginMm,
            pageHeightMm - 3.2,
            { align: "right" },
          );
        }

        pdf.save(createStandortanalysePdfFilename(meta));
        toast.success(t("exportSuccess"));
      } catch (error) {
        toast.error(t("exportFailed"));
        if (process.env.NODE_ENV !== "production") {
          console.error("Standortanalyse PDF export failed", error);
        }
      } finally {
        if (rootWasDark) {
          htmlRoot.classList.add("dark");
        }
        setIsExporting(false);
      }
    },
    [t],
  );

  const printReport = useCallback(() => {
    window.print();
  }, []);

  return {
    isExporting,
    downloadPdf,
    printReport,
  };
}
