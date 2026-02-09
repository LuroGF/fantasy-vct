"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function setStarterStatus(leagueId: string, profileId: string, playerId: string, isStarter: boolean) {
  const supabase = await createClient();
  try {
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("Alineación bloqueada durante la jornada.");
    }

    if (isStarter) {
        // Contar titulares actuales
        const { count } = await supabase
            .from("user_rosters")
            .select("player_id", { count: 'exact', head: true })
            .eq("league_id", leagueId)
            .eq("profile_id", profileId)
            .eq("is_starter", true);
        
        if (count !== null && count >= 5) {
            throw new Error("Ya tienes 5 titulares. Sienta a alguien primero.");
        }
    }

    const { error } = await supabase
      .from("user_rosters")
      .update({ is_starter: isStarter as any }) // Type casting if needed or update types
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId);

    if (error) throw error;

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
      is_starter,
      pro_players (
        id,
        nickname,
        role,
        market_value,
        team_id,
        pro_teams (
          tag,
          name,
          logo_url
        )
      )
    `)
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .order('is_starter', { ascending: false });

  if (error) {
    console.error("Error fetching roster:", error);
    return [];
  }
  return data;
}
