// src/lib/services/map-settings.ts
import { MAP_USER_SETTINGS_KEYS } from "@/lib/constants/map-providers";
import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { MapProviderId, MapSettingsPersisted } from "@/lib/validations/map-settings";
import { mapProviderSchema } from "@/lib/validations/map-settings";
import type { Json } from "@/types/supabase";

/** Persists `map_provider` as a JSON string (enum value). */
function jsonForMapProvider(provider: MapProviderId): Json {
  return provider;
}

/** Value for upsert; `null` means “clear” — `saveMapSettings` deletes the row (DB `value` is NOT NULL). */
function jsonForOptionalSecret(value: string | null): Json {
  return value;
}

function jsonToTrimmedString(value: Json | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  return null;
}

function parseProvider(value: Json | undefined): MapProviderId {
  const s = jsonToTrimmedString(value);
  if (s === null) return "osm";
  const parsed = mapProviderSchema.safeParse(s);
  return parsed.success ? parsed.data : "osm";
}

export async function loadMapSettings(): Promise<MapSettingsPersisted> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      map_provider: "osm",
      google_maps_api_key: null,
      apple_mapkit_token: null,
    };
  }

  const keys = [
    MAP_USER_SETTINGS_KEYS.map_provider,
    MAP_USER_SETTINGS_KEYS.google_api_key,
    MAP_USER_SETTINGS_KEYS.apple_mapkit_token,
  ] as const;

  const { data, error } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [...keys]);

  if (error) throw handleSupabaseError(error, "loadMapSettings");

  let map_provider: MapProviderId = "osm";
  let google_maps_api_key: string | null = null;
  let apple_mapkit_token: string | null = null;

  for (const row of data ?? []) {
    if (row.key === MAP_USER_SETTINGS_KEYS.map_provider) {
      map_provider = parseProvider(row.value);
    } else if (row.key === MAP_USER_SETTINGS_KEYS.google_api_key) {
      google_maps_api_key = jsonToTrimmedString(row.value);
    } else if (row.key === MAP_USER_SETTINGS_KEYS.apple_mapkit_token) {
      apple_mapkit_token = jsonToTrimmedString(row.value);
    }
  }

  return { map_provider, google_maps_api_key, apple_mapkit_token };
}

export async function saveMapSettings(settings: MapSettingsPersisted): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const rows = [
    {
      user_id: user.id,
      key: MAP_USER_SETTINGS_KEYS.map_provider,
      value: jsonForMapProvider(settings.map_provider),
    },
    {
      user_id: user.id,
      key: MAP_USER_SETTINGS_KEYS.google_api_key,
      value: jsonForOptionalSecret(settings.google_maps_api_key),
    },
    {
      user_id: user.id,
      key: MAP_USER_SETTINGS_KEYS.apple_mapkit_token,
      value: jsonForOptionalSecret(settings.apple_mapkit_token),
    },
  ];

  for (const row of rows) {
    const clearSecret =
      row.value === null &&
      (row.key === MAP_USER_SETTINGS_KEYS.google_api_key ||
        row.key === MAP_USER_SETTINGS_KEYS.apple_mapkit_token);

    if (clearSecret) {
      const { error } = await supabase.from("user_settings").delete().eq("user_id", user.id).eq("key", row.key);
      if (error) throw handleSupabaseError(error, "saveMapSettings");
      continue;
    }

    const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id,key" });
    if (error) throw handleSupabaseError(error, "saveMapSettings");
  }
}
