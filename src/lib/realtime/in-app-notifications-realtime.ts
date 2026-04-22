"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

function newRealtimeChannelInstanceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `i_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/**
 * Subscribes to `user_notifications` for the signed-in user so React Query lists
 * and unread counts stay fresh without waiting for `staleTime`.
 *
 * Handles **INSERT** (new badge) and **UPDATE** (e.g. `read_at` / mark-read elsewhere).
 *
 * Each **component instance** gets a unique Realtime channel topic. Supabase reuses a
 * topic string across callers; a second `useInAppNotificationsRealtime` (e.g. Header +
 * notifications page) would otherwise attach `.on()` after the shared channel already
 * subscribed and throw.
 */
export function useInAppNotificationsRealtime(userId: string, queryClient: QueryClient): void {
  const instanceIdRef = useRef<string | null>(null);
  if (instanceIdRef.current === null) {
    instanceIdRef.current = newRealtimeChannelInstanceId();
  }

  useEffect(() => {
    const instanceId = instanceIdRef.current ?? newRealtimeChannelInstanceId();
    const channelTopic = `in_app_notifications:${userId}:${instanceId}`;

    const supabase = createClient();

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["in-app-notifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["in-app-notifications-unread", userId] });
    };

    const filter = `user_id=eq.${userId}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
          filter,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
