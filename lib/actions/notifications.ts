"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { createNotification } from "@/lib/notifications/create";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { dispatchPendingPushNotifications } from "@/lib/notifications/push";

const DEFAULT_PREFERENCES = {
  push_enabled: false,
  market_enabled: true,
  gameweek_enabled: true,
  social_enabled: true,
  daily_reward_enabled: true,
};

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autorizado");
  return session;
}

export async function getUserNotifications() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data;
}

export async function syncMyAuctionNotifications() {
  const session = await requireSession();
  const profileId = session.user.id;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: auctions, error: auctionsError } = await supabaseAdmin
    .from("market_auctions")
    .select("id, league_id, winning_amount, pro_players(nickname)")
    .eq("winner_profile_id", profileId)
    .in("status", ["resolved", "sold", "completed"])
    .gte("resolved_at", since);

  if (auctionsError) {
    console.error("Error syncing auction notifications:", auctionsError);
    return { success: false, created: 0 };
  }

  const dedupeKeys = (auctions || []).map(
    (auction: any) => `auction-won:${auction.id}`,
  );
  if (dedupeKeys.length === 0) return { success: true, created: 0 };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("notifications")
    .select("dedupe_key")
    .eq("profile_id", profileId)
    .in("dedupe_key", dedupeKeys);

  if (existingError) {
    console.error("Error checking auction notifications:", existingError);
    return { success: false, created: 0 };
  }

  const existingKeys = new Set(
    (existing || []).map((notification: any) => notification.dedupe_key),
  );
  let created = 0;

  for (const auction of auctions || []) {
    const dedupeKey = `auction-won:${auction.id}`;
    if (existingKeys.has(dedupeKey)) continue;

    const playerName = (auction as any).pro_players?.nickname || "un jugador";
    const amount = Number(auction.winning_amount || 0);
    const result = await createNotification({
      profile_id: profileId,
      league_id: auction.league_id,
      title: `Has fichado a ${playerName}`,
      message: `Has ganado la puja por ${playerName} por ${amount.toLocaleString("es-ES")} €.`,
      type: "auction_won",
      category: "market",
      action_url: `/team?league=${auction.league_id}`,
      dedupe_key: dedupeKey,
    });

    if (result.success && !result.deduplicated) created += 1;
  }

  return { success: true, created };
}

export async function flushMyPendingPushNotifications() {
  const session = await requireSession();

  try {
    const result = await dispatchPendingPushNotifications(20, session.user.id);
    return { success: true, ...result };
  } catch (error) {
    console.error("Error dispatching user push notifications:", error);
    return { success: false, processed: 0, sent: 0 };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", session.user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/more/notifications");
  return { success: true };
}

export async function deleteReadNotification(notificationId: string) {
  const session = await requireSession();
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("profile_id", session.user.id)
    .eq("is_read", true);

  if (error) return { success: false, error: error.message };
  revalidatePath("/more/notifications");
  return { success: true };
}

export async function markAllAsRead() {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("profile_id", session.user.id)
    .eq("is_read", false);

  if (error) return { success: false, error: error.message };
  revalidatePath("/more/notifications");
  return { success: true };
}

export async function getUnreadCount() {
  const session = await getSession();
  if (!session) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", session.user.id)
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}

export async function getNotificationPreferences() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("push_enabled, market_enabled, gameweek_enabled, social_enabled, daily_reward_enabled")
    .eq("profile_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching notification preferences:", error);
  }
  return data || DEFAULT_PREFERENCES;
}

export async function updateNotificationPreferences(input: {
  push_enabled: boolean;
  market_enabled: boolean;
  gameweek_enabled: boolean;
  social_enabled: boolean;
  daily_reward_enabled: boolean;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        profile_id: session.user.id,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );

  if (error) return { success: false, error: error.message };
  revalidatePath("/more/notifications");
  return { success: true };
}

export async function sendTestNotification() {
  const session = await requireSession();
  const result = await createNotification({
    profile_id: session.user.id,
    title: "Notificaciones activadas",
    message: "La campana y las notificaciones push de VCT Fantasy funcionan correctamente.",
    type: "push_test",
    category: "system",
    action_url: "/more/notifications",
  });

  if (!result.success) {
    return { success: false, error: "No se ha podido crear la notificación de prueba." };
  }

  return {
    success: true,
    pushStatus: result.push?.status || "skipped",
    sent: result.push?.sent || 0,
  };
}
