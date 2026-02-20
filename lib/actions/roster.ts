"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function setStarterStatus(leagueId: string, profileId: string, playerId: string, newSlot: 'starter' | 'substitute') {
  const supabase = await createClient();
  try {
    // 1. Real-time Lock Check (Match Day protection)
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);

    if (lockStatus.locked) {
        // If locked, we need to know if the player is currently a starter or trying to be one
        const { data: currentPlayerEntry } = await supabase
            .from("user_rosters")
            .select("slot_type")
            .eq("league_id", leagueId)
            .eq("profile_id", profileId)
            .eq("player_id", playerId)
            .single();

        if (currentPlayerEntry?.slot_type === 'starter' || newSlot === 'starter') {
            throw new Error(`Mercado bloqueado: ${lockStatus.reason}. Solo puedes operar con suplentes.`);
        }
    }

    // 2. Call Atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc('handle_set_starter_status', {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_player_id: playerId,
        p_new_slot: newSlot
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "No se pudo actualizar la alineación.");

    revalidatePath("/team");
    revalidatePath("/"); // Update global navbar/stats
    return { success: true, message: `Alineación actualizada: ${result.role || 'Agente'} movido a ${newSlot}.` };
  } catch (error: any) {
    console.error("Roster Change Error:", error);
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

