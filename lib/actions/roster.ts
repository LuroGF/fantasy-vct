"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function setStarterStatus(leagueId: string, profileId: string, playerId: string, newSlot: 'starter' | 'substitute' | 'bench') {
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

    // Check limits and role uniqueness
    if (newSlot === 'starter') {
        const { data: currentRoster, error: rosterError } = await supabase
            .from("user_rosters")
            .select("player_id, pro_players(role)")
            .eq("league_id", leagueId)
            .eq("profile_id", profileId)
            .eq("slot_type", 'starter');
        
        if (rosterError) throw rosterError;

        if (currentRoster && currentRoster.length >= 5) {
            throw new Error("Ya tienes 5 titulares. Sienta a alguien primero.");
        }

        // Fetch the role of the player being promoted
        const { data: player, error: playerError } = await supabase
            .from("pro_players")
            .select("role")
            .eq("id", playerId)
            .single();

        if (playerError) throw playerError;

        const roleTaken = currentRoster?.some(r => (r.pro_players as any).role === player.role);
        if (roleTaken) {
            throw new Error(`Ya tienes un ${player.role} en tus titulares. Debes tener uno de cada rol (incluyendo Flex).`);
        }
    } else if (newSlot === 'substitute') {

        const { count } = await supabase
            .from("user_rosters")
            .select("player_id", { count: 'exact', head: true })
            .eq("league_id", leagueId)
            .eq("profile_id", profileId)
            .eq("slot_type", 'substitute');
        
        if (count !== null && count >= 4) {
            throw new Error("Ya tienes 4 suplentes permitidos.");
        }
    }

    const { error } = await supabase
      .from("user_rosters")
      .update({ 
        slot_type: newSlot,
        is_starter: newSlot === 'starter' 
      })
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
      slot_type,
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
    .order('slot_type', { ascending: true }); // Starter usually first

  if (error) {
    console.error("Error fetching roster:", error);
    return [];
  }
  return data;
}

