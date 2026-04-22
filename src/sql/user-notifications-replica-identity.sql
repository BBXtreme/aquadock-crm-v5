-- One-time (existing projects): if `user_notifications` was created before REPLICA IDENTITY
-- was added to `user_notifications.sql`, run this in Supabase SQL Editor so Realtime
-- `UPDATE` subscriptions with `user_id=eq.<uid>` behave reliably.
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
