export type PdfPageSlice = {
  sourceY: number;
  sourceHeight: number;
  targetHeightMm: number;
};

export function sanitizePdfFilenamePart(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  return normalized === "" ? "standortanalyse" : normalized;
}

export function createStandortanalysePdfFilename(input: { ort: string; analysisId: string | null }): string {
  const ort = sanitizePdfFilenamePart(input.ort);
  const idPart = input.analysisId != null ? sanitizePdfFilenamePart(input.analysisId).slice(0, 8) : "entwurf";
  return `Standortanalyse_${ort}_${idPart}.pdf`;
}

export function computePdfPageSlices(input: {
  canvasWidthPx: number;
  canvasHeightPx: number;
  pageWidthMm: number;
  pageHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
}): PdfPageSlice[] {
  const safeCanvasWidth = Math.max(1, input.canvasWidthPx);
  const safeCanvasHeight = Math.max(1, input.canvasHeightPx);
  const usableWidthMm = Math.max(1, input.contentWidthMm);
  const usableHeightMm = Math.max(1, input.contentHeightMm);

  const totalImageHeightMm = (safeCanvasHeight * usableWidthMm) / safeCanvasWidth;
  const sliceHeightPx = (safeCanvasWidth * usableHeightMm) / usableWidthMm;

  if (totalImageHeightMm <= usableHeightMm) {
    return [
      {
        sourceY: 0,
        sourceHeight: safeCanvasHeight,
        targetHeightMm: totalImageHeightMm,
      },
    ];
  }

  const slices: PdfPageSlice[] = [];
  let currentY = 0;
  while (currentY < safeCanvasHeight) {
    const remainingPx = safeCanvasHeight - currentY;
    const currentSliceHeightPx = Math.min(Math.round(sliceHeightPx), remainingPx);
    const targetHeightMm = (currentSliceHeightPx * usableWidthMm) / safeCanvasWidth;
    slices.push({
      sourceY: currentY,
      sourceHeight: currentSliceHeightPx,
      targetHeightMm,
    });
    currentY += currentSliceHeightPx;
  }

  if (slices.length >= 2) {
    const lastIndex = slices.length - 1;
    const lastSlice = slices[lastIndex];
    const prevSlice = slices[lastIndex - 1];
    if (lastSlice != null && prevSlice != null && lastSlice.targetHeightMm < usableHeightMm * 0.25) {
      const mergeDelta = Math.round(lastSlice.sourceHeight / 2);
      prevSlice.sourceHeight = Math.max(1, prevSlice.sourceHeight - mergeDelta);
      prevSlice.targetHeightMm = (prevSlice.sourceHeight * usableWidthMm) / safeCanvasWidth;
      lastSlice.sourceY = prevSlice.sourceY + prevSlice.sourceHeight;
      lastSlice.sourceHeight = Math.max(1, safeCanvasHeight - lastSlice.sourceY);
      lastSlice.targetHeightMm = (lastSlice.sourceHeight * usableWidthMm) / safeCanvasWidth;
    }
  }

  return slices;
}
