// src/lib/validations/map-settings.ts
import { z } from "zod";

export const mapProviderSchema = z.enum(["osm", "google", "apple"]);

export type MapProviderId = z.infer<typeof mapProviderSchema>;

function emptyStringToNull(val: string | null | undefined): string | null | undefined {
  if (val === undefined) return undefined;
  if (val === null) return null;
  return val === "" ? null : val;
}

export const mapSettingsFormSchema = z
  .object({
    map_provider: mapProviderSchema,
    google_maps_api_key: z
      .string()
      .trim()
      .max(500, "Google API-Schlüssel ist zu lang")
      .nullable()
      .optional()
      .transform(emptyStringToNull),
    apple_mapkit_token: z
      .string()
      .trim()
      .max(2000, "MapKit-Token ist zu lang")
      .nullable()
      .optional()
      .transform(emptyStringToNull),
  })
  .strict();

export type MapSettingsForm = z.infer<typeof mapSettingsFormSchema>;

export type MapSettingsPersisted = {
  map_provider: MapProviderId;
  google_maps_api_key: string | null;
  apple_mapkit_token: string | null;
};
