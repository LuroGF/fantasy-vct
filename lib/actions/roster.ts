"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function togglePlayerStatus(leagueId: string, profileId: string, playerId: string) {
  const supabase = await createClient();
  try {
    // 1. Obtener el estado actual del jugador
    const { data: currentRoster, error: fetchError } = await supabase
      .from("user_rosters")
      .select("is_active")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId)
      .single();

    if (fetchError || !currentRoster) throw new Error("No se ha encontrado al agente en tu plantilla");

    const newStatus = !currentRoster.is_active;

    // 2. Si se va a activar, validar que no haya ya 5 activos
    if (newStatus === true) {
      const { count, error: countError } = await supabase
        .from("user_rosters")
        .select("*", { count: 'exact', head: true })
        .eq("league_id", leagueId)
        .eq("profile_id", profileId)
        .eq("is_active", true);

      if (countError) throw countError;
      if (count && count >= 5) {
        throw new Error("Cupo de titulares completo (Máximo 5 agentes activos)");
      }
    }

    // 3. Actualizar el estado
    const { error: updateError } = await supabase
      .from("user_rosters")
      .update({ is_active: newStatus })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId);

    if (updateError) throw updateError;

    revalidatePath("/team");
    return { success: true, newStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar la alineación";
    return { success: false, error: message };
  }
}

export async function getUserFullRoster(leagueId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_rosters")
    .select(`
      player_id,
      acquisition_price,
      release_clause,
      is_active,
      pro_players (
        id,
        nickname,
        role,
        market_value,
        pro_teams (
          tag,
          name
        )
      )
    `)
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)
    .order('is_active', { ascending: false });

  if (error) {
    console.error("Error fetching full roster:", error);
    return [];
  }
  return data;
}
