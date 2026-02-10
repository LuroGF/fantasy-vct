"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function setStarterStatus(leagueId: string, profileId: string, playerId: string, newSlot: 'starter' | 'substitute') {
  const supabase = await createClient();
  try {
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    // Fetch current player to check current slot
    const { data: currentPlayer } = await supabase
      .from("user_rosters")
      .select("slot_type")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId)
      .single();

    if (activeGw?.is_locked) {
      if (currentPlayer?.slot_type === 'starter' || newSlot === 'starter') {
        throw new Error("Alineación titular blindada durante la jornada. Solo puedes operar con suplentes.");
      }
    }

    // Fetch current roster with roles
    const { data: roster, error: rosterError } = await supabase
        .from("user_rosters")
        .select("player_id, slot_type, pro_players(role)")
        .eq("league_id", leagueId)
        .eq("profile_id", profileId);
    
    if (rosterError) throw rosterError;

    // Get the player's role
    const playerEntry = roster?.find(r => r.player_id === playerId);
    if (!playerEntry) throw new Error("Jugador no encontrado en tu plantilla.");
    
    const playerRole = (playerEntry.pro_players as any).role;
    const currentSlot = playerEntry.slot_type;

    // If moving to same slot, do nothing
    if (currentSlot === newSlot) {
      return { success: true };
    }

    // Count roles in target slot (excluding the player being moved)
    const targetSlotPlayers = roster?.filter(r => r.slot_type === newSlot && r.player_id !== playerId) || [];
    
    // Check if there's a player with same role in target slot
    const conflictingPlayer = targetSlotPlayers.find(r => (r.pro_players as any).role === playerRole);

    if (conflictingPlayer) {
      // SWAP: Move conflicting player to current slot
      const { error: swapError } = await supabase
        .from("user_rosters")
        .update({ 
          slot_type: currentSlot,
          is_starter: currentSlot === 'starter' 
        })
        .eq("league_id", leagueId)
        .eq("profile_id", profileId)
        .eq("player_id", conflictingPlayer.player_id);

      if (swapError) throw swapError;
    } else {
      // Check slot limit
      if (targetSlotPlayers.length >= 5) {
        throw new Error(`Máximo 5 ${newSlot === 'starter' ? 'titulares' : 'suplentes'}.`);
      }
    }

    // Move the player
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

