import { readOpenmapPoiCacheSnapshot, writeOpenmapPoiCacheSnapshot } from "@/lib/storage/openmap-poi-cache-session";
import { createClient } from "@/lib/supabase/browser";

/**
 * Clears the Supabase session in the browser and navigates to `/login`.
 * Preserves `openmap-poi-cache` if `signOut` or related auth storage logic touches localStorage.
 * Use from client components only (`window` is required).
 */
export async function performBrowserSignOutToLogin(): Promise<boolean> {
  const openmapPoiCacheSnapshot = readOpenmapPoiCacheSnapshot();
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return false;
    }
    window.location.assign("/login");
    return true;
  } finally {
    writeOpenmapPoiCacheSnapshot(openmapPoiCacheSnapshot);
  }
}
