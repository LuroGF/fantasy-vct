"use server";

import { createClient } from "@/utils/supabase/server";
import { getSession } from "./auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  username?: string;
  bio?: string;
  banner_color?: string;
  fav_team_id?: string;
  title?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const userId = session.user.id;

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/more/profile");
  return { success: true };
}

export async function getAllTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_teams")
    .select("id, name, tag, logo_url")
    .order("name");
  
  if (error) return [];
  return data;
}
