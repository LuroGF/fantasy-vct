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

    // 1. Real-time Lock Check (Match Day protection)
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);

    // Fetch current player to check current slot
    const { data: currentPlayerEntry } = await supabase
      .from("user_rosters")
      .select("slot_type, pro_players(role)")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId)
      .single();

    if (lockStatus.locked) {
      if (currentPlayerEntry?.slot_type === 'starter' || newSlot === 'starter') {
        throw new Error(`Mercado bloqueado: ${lockStatus.reason}. Solo puedes operar con suplentes.`);
      }
    }

    // 2. Fetch current roster with roles for validation
    const { data: roster, error: rosterError } = await (supabase
        .from("user_rosters")
        .select("player_id, slot_type, pro_players(role)")
        .eq("league_id", leagueId)
        .eq("profile_id", profileId) as any);
    
    if (rosterError) throw rosterError;

    // Get the player's role
    const playerEntry = roster?.find((r: any) => r.player_id === playerId);
    if (!playerEntry) throw new Error("Jugador no encontrado en tu plantilla.");
    
    const playerRole = (playerEntry.pro_players as any)?.role;
    const currentSlot = playerEntry.slot_type;

    if (currentSlot === newSlot) return { success: true };

    // 3. ENFORCE ROLE UNIQUENESS PER SLOT
    // Find if there's ALREADY a player with the same role in the target slot
    const targetSlotPlayers = roster?.filter((r: any) => r.slot_type === newSlot && r.player_id !== playerId) || [];
    const conflictingPlayer = targetSlotPlayers.find((r: any) => 
        (r.pro_players as any)?.role?.trim().toUpperCase() === playerRole?.trim().toUpperCase()
    );

    if (conflictingPlayer) {
      // SWAP: Move the existing player of that role to the slot we are leaving
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
      // If no conflict, just check capacity
      if (targetSlotPlayers.length >= 5) {
        throw new Error(`Ya tienes 5 ${newSlot === 'starter' ? 'titulares' : 'suplentes'}. Debes mover a alguien al banquillo primero.`);
      }
    }

    // 4. Move the player
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

