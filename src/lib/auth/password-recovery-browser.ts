import type { SupabaseClient } from "@supabase/supabase-js";
import { PW_RECOVERY_SESSION_STORAGE_KEY } from "@/lib/constants/auth-recovery";

export function isPasswordRecoveryFromUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const fromHash = new URLSearchParams(hash).get("type");
    if (fromHash === "recovery") {
      return true;
    }
  }
  return (
    new URLSearchParams(window.location.search).get("type") === "recovery"
  );
}

export function urlMayCarryRecoveryTokens(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (isPasswordRecoveryFromUrl()) {
    return true;
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hp = new URLSearchParams(hash);
    if (hp.has("access_token") && hp.has("refresh_token")) {
      return true;
    }
  }
  const sp = new URLSearchParams(window.location.search);
  return sp.has("code");
}

export async function tryHydrateRecoverySessionFromHash(
  supabase: SupabaseClient,
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) {
    return false;
  }
  const params = new URLSearchParams(raw);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    return false;
  }
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) {
    return false;
  }
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  return true;
}

function amrIndicatesRecovery(amr: unknown): boolean {
  let list: unknown = amr;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list) as unknown;
    } catch {
      return false;
    }
  }
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some((entry) => {
    if (entry === "recovery") {
      return true;
    }
    if (typeof entry === "object" && entry !== null && "method" in entry) {
      return (entry as { method?: string }).method === "recovery";
    }
    return false;
  });
}

export function accessTokenIndicatesRecovery(accessToken: string): boolean {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return false;
    }
    const payloadPart = parts[1];
    if (payloadPart === undefined) {
      return false;
    }
    let base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
      base64 += "=".repeat(4 - pad);
    }
    const json = atob(base64);
    const payload = JSON.parse(json) as { amr?: unknown };
    return amrIndicatesRecovery(payload.amr);
  } catch {
    return false;
  }
}

export function consumePasswordRecoveryBootstrapFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const v = sessionStorage.getItem(PW_RECOVERY_SESSION_STORAGE_KEY);
    if (v === "1") {
      sessionStorage.removeItem(PW_RECOVERY_SESSION_STORAGE_KEY);
      return true;
    }
  } catch {
    // sessionStorage blocked or quota
  }
  return false;
}

export const RECOVERY_SESSION_READY_TIMEOUT_MS = 10_000;
