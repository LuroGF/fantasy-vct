import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  sendPushToUser,
  type NotificationCategory,
} from "./push";

export type CreateNotificationInput = {
  profile_id: string;
  league_id?: string | null;
  title: string;
  message: string;
  type: string;
  category?: NotificationCategory;
  action_url?: string | null;
  dedupe_key?: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  const notification = {
    ...input,
    category: input.category || "system",
    league_id: input.league_id || null,
    action_url: input.action_url || null,
    dedupe_key: input.dedupe_key || null,
  };

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert(notification)
    .select("id")
    .single();

  if (error?.code === "23505") return { success: true, deduplicated: true };
  if (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }

  const push = await sendPushToUser(
    input.profile_id,
    {
      title: input.title,
      body: input.message,
      url: input.action_url || "/more/notifications",
      tag: input.type,
    },
    notification.category,
  );

  await supabaseAdmin
    .from("notifications")
    .update({
      push_processed_at: new Date().toISOString(),
      push_status: push.status,
    })
    .eq("id", data.id);

  return { success: true, id: data.id, push };
}
