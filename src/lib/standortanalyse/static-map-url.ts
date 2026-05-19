type StaticMapOptions = {
  width?: number;
  height?: number;
  zoom?: number;
};

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 420;
const DEFAULT_ZOOM = 14;

function normalizeDimension(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.round(value);
}

export function buildStandortStaticMapUrl(
  lat: number,
  lon: number,
  options: StaticMapOptions = {},
): string {
  const width = normalizeDimension(options.width, DEFAULT_WIDTH);
  const height = normalizeDimension(options.height, DEFAULT_HEIGHT);
  const zoom = normalizeDimension(options.zoom, DEFAULT_ZOOM);
  const latFixed = lat.toFixed(6);
  const lonFixed = lon.toFixed(6);
  const center = `${latFixed},${lonFixed}`;

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${encodeURIComponent(`${latFixed},${lonFixed},red-pushpin`)}`;
}
