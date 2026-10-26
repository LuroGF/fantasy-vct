import webpush from "web-push";
import { supabaseAdmin } from "@/utils/supabase/admin";

export type NotificationCategory =
  | "market"
  | "gameweek"
  | "social"
  | "daily_reward"
  | "system";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushResult = {
  status: "sent" | "skipped" | "failed";
  sent: number;
};

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@fantasyvct.com",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

function categoryAllowed(preferences: any, category: NotificationCategory) {
  if (!preferences?.push_enabled) return false;
  if (category === "market") return preferences.market_enabled;
  if (category === "gameweek") return preferences.gameweek_enabled;
  if (category === "social") return preferences.social_enabled;
  if (category === "daily_reward") return preferences.daily_reward_enabled;
  return true;
}

export async function sendPushToUser(
  profileId: string,
  payload: PushPayload,
  category: NotificationCategory = "system",
): Promise<PushResult> {
  if (!configureVapid()) return { status: "skipped", sent: 0 };

  const [{ data: preferences }, { data: subscriptions, error }] = await Promise.all([
    supabaseAdmin
      .from("notification_preferences")
      .select("push_enabled, market_enabled, gameweek_enabled, social_enabled, daily_reward_enabled")
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profileId),
  ]);

  if (!categoryAllowed(preferences, category) || error || !subscriptions?.length) {
    return { status: "skipped", sent: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
    tag: payload.tag || "vct-fantasy",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          return;
        }
        failed += 1;
        console.error("Push delivery failed:", error?.message || error);
      }
    }),
  );

  if (sent > 0) return { status: "sent", sent };
  if (failed > 0) return { status: "failed", sent: 0 };
  return { status: "skipped", sent: 0 };
}

export async function dispatchPendingPushNotifications(
  limit = 100,
  profileId?: string,
) {
  let query = supabaseAdmin
    .from("notifications")
    .select("id, profile_id, title, message, category, action_url, type")
    .is("push_processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (profileId) query = query.eq("profile_id", profileId);

  const { data: notifications, error } = await query;

  if (error) throw error;

  let sent = 0;
  for (const notification of notifications || []) {
    const result = await sendPushToUser(
      notification.profile_id,
      {
        title: notification.title,
        body: notification.message,
        url: notification.action_url || "/more/notifications",
        tag: notification.type || "vct-fantasy",
      },
      (notification.category || "system") as NotificationCategory,
    );

    await supabaseAdmin
      .from("notifications")
      .update({
        push_processed_at: new Date().toISOString(),
        push_status: result.status,
      })
      .eq("id", notification.id);

    sent += result.sent;
  }

  return { processed: notifications?.length || 0, sent };
}
