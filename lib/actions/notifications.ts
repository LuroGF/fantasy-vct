"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getUserNotifications(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error };
  }

  revalidatePath("/"); // Update UI everywhere
  return { success: true };
}

export async function markAllAsRead(profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error };
  }

  revalidatePath("/");
  return { success: true };
}


export async function createNotification(data: {
  profile_id: string;
  league_id?: string;
  title: string;
  message: string;
  type: string;
}) {
  const { error } = await supabaseAdmin
    .from("notifications")
    .insert([data]);

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }

  return { success: true };
}

export async function getUnreadCount(profileId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: 'exact', head: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}
