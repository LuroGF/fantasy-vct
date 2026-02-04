"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Función para generar un código de invitación aleatorio
function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createLeague(name: string, userId: string) {
  const supabase = await createClient();
  try {
    const inviteCode = generateInviteCode();
    
    // 1. Crear la liga
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({ 
        name, 
        invite_code: inviteCode, 
        creator_id: userId,
        budget_limit: 100000000 // 100M por defecto
      })
      .select()
      .single();

    if (leagueError) throw leagueError;

    // 2. Unir al creador a la liga automáticamente como participante
    const { error: joinError } = await supabase
      .from("league_participants")
      .insert({ 
        profile_id: userId, 
        league_id: league.id,
        current_budget: 100000000 
      });

    if (joinError) throw joinError;

    revalidatePath("/leagues");
    return { success: true, league };
  } catch (error) {
    console.error("Error creating league:", error);
    return { success: false, error };
  }
}

export async function joinLeague(inviteCode: string, userId: string) {
  const supabase = await createClient();
  try {
    // 1. Buscar la liga por código
    const { data: league, error: findError } = await supabase
      .from("leagues")
      .select("id, budget_limit")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (findError) throw new Error("Código de invitación no válido");

    // 2. Unirse a la liga
    const { error: joinError } = await supabase
      .from("league_participants")
      .insert({ 
        profile_id: userId, 
        league_id: league.id,
        current_budget: league.budget_limit 
      });

    if (joinError) {
       if (joinError.code === "23505") throw new Error("Ya perteneces a esta liga");
       throw joinError;
    }

    revalidatePath("/leagues");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al unirse a la liga";
    return { success: false, error: message };
  }
}

export async function getUserLeagues(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_participants")
    .select(`
      total_points,
      current_budget,
      leagues (
        id,
        name,
        invite_code
      )
    `)
    .eq("profile_id", userId);

  if (error) {
    console.error("Error fetching leagues:", error);
    return [];
  }
  return data;
}
