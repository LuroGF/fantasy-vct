"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_TRANSFERS_PER_WEEK = 3;

export async function buyPlayer(leagueId: string, profileId: string, playerId: string, price: number) {
  const supabase = await createClient();
  try {
    // 1. Verificar si la jornada está bloqueada
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("El mercado está cerrado para esta jornada (jornada bloqueada)");
    }

    // 2. Verificar presupuesto y límite de transferencias
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget, transfers_made_this_week")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el presupuesto/límites");
    
    // Check if user has active "SCOUT" power-up (+1 transfer)
    let allowedTransfers = MAX_TRANSFERS_PER_WEEK;
    if (activeGw) {
        const { data: scout } = await supabase
            .from('active_powerups')
            .select('id, powerup_types!inner(code)')
            .eq('league_id', leagueId)
            .eq('profile_id', profileId)
            .eq('gameweek_id', activeGw.id)
            .eq('powerup_types.code', 'SCOUT')
            .maybeSingle();
        
        if (scout) allowedTransfers += 1;
    }

    if (participant.transfers_made_this_week >= allowedTransfers) {
      throw new Error(`Has alcanzado el límite de ${allowedTransfers} transferencias por jornada`);
    }
    
    if (participant.current_budget < price) throw new Error("Presupuesto insuficiente");

    // 3. Verificar si el jugador ya pertenece a alguien más en esta liga (Draft cerrado)
    const { data: existingOwner } = await supabase
      .from("user_rosters")
      .select("profile_id")
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .single();

    if (existingOwner) throw new Error("Este jugador ya ha sido fichado por otro agente");

    // 4. Registrar transacción
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

    // 5. Añadir al Roster
    const { error: rError } = await supabase
      .from("user_rosters")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        acquisition_price: price,
        is_active: true,
        release_clause: price * 2 // Cláusula automática x2
      });

    if (rError) throw rError;

    // 6. Actualizar presupuesto y contador de transferencias
    const { error: bError } = await supabase
      .from("league_participants")
      .update({ 
        current_budget: participant.current_budget - price,
        transfers_made_this_week: participant.transfers_made_this_week + 1
      })
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

export async function sellPlayer(leagueId: string, profileId: string, playerId: string, price: number) {
  const supabase = await createClient();
  try {
    // 1. Verificar si la jornada está bloqueada
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("El mercado está cerrado para esta jornada (jornada bloqueada)");
    }

    // 2. Verificar límite de transferencias
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget, transfers_made_this_week")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar los límites");
    
    // Check if user has active "SCOUT" power-up (+1 transfer)
    let allowedTransfers = MAX_TRANSFERS_PER_WEEK;
    if (activeGw) {
        const { data: scout } = await supabase
            .from('active_powerups')
            .select('id, powerup_types!inner(code)')
            .eq('league_id', leagueId)
            .eq('profile_id', profileId)
            .eq('gameweek_id', activeGw.id)
            .eq('powerup_types.code', 'SCOUT')
            .maybeSingle();
        
        if (scout) allowedTransfers += 1;
    }

    if (participant.transfers_made_this_week >= allowedTransfers) {
      throw new Error(`Has alcanzado el límite de ${allowedTransfers} transferencias por jornada`);
    }

    // 3. Eliminar del Roster (o marcar como inactivo)
    // En este caso eliminamos para permitir que otro lo fiche de nuevo
    const { error: rError } = await supabase
      .from("user_rosters")
      .delete()
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId);

    if (rError) throw rError;

    // 4. Registrar transacción
    const { error: tError } = await supabase
      .from("market_transactions")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        type: 'sell',
        price: price
      });

    if (tError) throw tError;

    // 5. Actualizar presupuesto y contador
    const { error: bError } = await supabase
      .from("league_participants")
      .update({ 
        current_budget: Number(participant.current_budget) + price,
        transfers_made_this_week: participant.transfers_made_this_week + 1
      })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    if (bError) throw bError;

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar la venta";
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
      release_clause,
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
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching roster:", error);
    return [];
  }
  return data;
}

export async function payClause(leagueId: string, buyerProfileId: string, playerId: string) {
  const supabase = await createClient();
  try {
    // 1. Obtener datos del jugador y su dueño actual
    const { data: rosterEntry, error: rError } = await supabase
      .from("user_rosters")
      .select(`
        profile_id,
        acquisition_price,
        release_clause,
        pro_players!inner (
          id,
          nickname,
          market_value
        )
      `)
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .eq("is_active", true)
      .single();

    if (rError || !rosterEntry) throw new Error("Jugador no encontrado en ningún equipo activo.");
    
    const ownerId = rosterEntry.profile_id;
    const clausePrice = rosterEntry.release_clause;

    if (ownerId === buyerProfileId) throw new Error("Ya posees a este jugador.");

    // 2. Verificar si el jugador está protegido (LOCK)
    const { data: activeGw } = await supabase
        .from('gameweeks')
        .select('id, is_locked')
        .eq('is_active', true)
        .single();
    
    // Si hay lock, check powerups
    if (activeGw) {
        if (activeGw.is_locked) throw new Error("Mercado cerrado durante la jornada.");

        // Check active 'LOCK' powerups
        const { data: lock } = await supabase
            .from('active_powerups')
            .select('id, powerup_types!inner(code)')
            .eq('league_id', leagueId)
            .eq('profile_id', ownerId)
            .eq('target_player_id', playerId)
            .eq('gameweek_id', activeGw.id)
            .single(); // Assuming unique constraint helps here or we take any
        
        if (lock && (lock.powerup_types as any)?.code === 'LOCK') {
             throw new Error("Este jugador está BLINDADO por su equipo actual.");
        }
    }

    // 3. Verificar presupuesto del comprador
    const { data: buyer, error: bError } = await supabase
        .from("league_participants")
        .select("current_budget")
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId)
        .single();
    
    if (bError || !buyer) throw new Error("Error verificando presupuesto.");
    if (Number(buyer.current_budget) < Number(clausePrice)) throw new Error("Presupuesto insuficiente para pagar la cláusula.");

    // 4. EJECUTAR TRANSFERENCIA (Transacción Compleja)
    
    // A. Cobrar al comprador
    const { error: chargeError } = await supabase
        .from("league_participants")
        .update({ current_budget: Number(buyer.current_budget) - Number(clausePrice) })
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId);
    if (chargeError) throw chargeError;

    // B. Pagar al dueño original (Cláusula completa)
    const { data: owner } = await supabase
        .from("league_participants")
        .select("current_budget")
        .eq("league_id", leagueId)
        .eq("profile_id", ownerId)
        .single();
    
    if (owner) {
        await supabase
            .from("league_participants")
            .update({ current_budget: Number(owner.current_budget) + Number(clausePrice) })
            .eq("league_id", leagueId)
            .eq("profile_id", ownerId);
    }

    // C. Transferir propiedad (Eliminar del anterior, crear en nuevo)
    await supabase.from("user_rosters")
        .delete()
        .eq("league_id", leagueId)
        .eq("player_id", playerId)
        .eq("profile_id", ownerId);
    
    // Nueva cláusula automática (200% del pago)
    const newClause = Math.floor(Number(clausePrice) * 2); 

    await supabase.from("user_rosters")
        .insert({
            league_id: leagueId,
            profile_id: buyerProfileId,
            player_id: playerId,
            acquisition_price: clausePrice,
            release_clause: newClause,
            is_active: true
        });

    // D. Registrar Transacción (Clause Pay)
    await supabase.from("market_transactions")
        .insert({
            league_id: leagueId,
            profile_id: buyerProfileId,
            player_id: playerId,
            type: 'clause_paid', // Make sure DB constrains allow this enum or string
            price: clausePrice
        });

    // E. Notificar al dueño anterior
    const { createNotification } = await import("./notifications");
    const playerName = (rosterEntry.pro_players as any).nickname;
    await createNotification({
      profile_id: ownerId,
      league_id: leagueId,
      title: "⚠️ ¡Cláusula Pagada!",
      message: `El usuario ha pagado la cláusula de $${(clausePrice / 1000000).toFixed(1)}M por ${playerName}.`,
      type: "hostile_buy"
    });

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: `Cláusula pagada. Has fichado a ${playerName}` };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al pagar cláusula";
    console.error(error);
    return { success: false, error: message };
  }
}
