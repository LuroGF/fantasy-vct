"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function buyPlayer(leagueId: string, profileId: string, playerId: string, price: number) {
  const supabase = await createClient();
  try {
    // 1. Verificar presupuesto del usuario en esta liga
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el presupuesto");
    if (participant.current_budget < price) throw new Error("Presupuesto insuficiente");

    // 2. Verificar si el jugador ya pertenece a alguien más en esta liga (Draft cerrado)
    const { data: existingOwner } = await supabase
      .from("user_rosters")
      .select("profile_id")
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .single();

    if (existingOwner) throw new Error("Este jugador ya ha sido fichado por otro agente");

    // 3. Iniciar transacción (simulada mediante inserts secuenciales ya que Supabase RPC es mejor para esto)

    // A. Registrar transacción
    const { error: tError } = await supabase
      .from("market_transactions")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        type: 'buy',
        price: price
      });

    if (tError) throw tError;

    // B. Añadir a Roster
    const { error: rError } = await supabase
      .from("user_rosters")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        acquisition_price: price,
        is_active: true
      });

    if (rError) throw rError;

    // C. Actualizar presupuesto
    const { error: bError } = await supabase
      .from("league_participants")
      .update({ current_budget: participant.current_budget - price })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    if (bError) throw bError;

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar el fichaje";
    return { success: false, error: message };
  }
}

export async function getUserRoster(leagueId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_rosters")
    .select(`
      player_id,
      acquisition_price,
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
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching roster:", error);
    return [];
  }
  return data;
}
