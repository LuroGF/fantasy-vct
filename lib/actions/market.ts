"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_TRANSFERS_PER_WEEK = 3;

export async function buyPlayer(leagueId: string, profileId: string, playerId: string) {
  const supabase = await createClient();
  try {
    // 1. Obtener datos del jugador (Precio real)
    const { data: playerData, error: plError } = await supabase
        .from('pro_players')
        .select('market_value')
        .eq('id', playerId)
        .single();
    
    if (plError || !playerData) throw new Error("Jugador no encontrado");
    
    const price = playerData.market_value;

    // 2. Verificar bloqueo de jornada
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("El mercado está cerrado (Jornada en curso).");
    }

    // 3. Verificar presupuesto y límite de transferencias
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget, transfers_made_this_week")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el presupuesto/límites");
    
    // Check SCOUT powerup
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

    // Check current roster size for emergency rebuild exception
    const { count: currentRosterSize } = await supabase
      .from("user_rosters")
      .select("id", { count: 'exact', head: true })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("is_active", true);

    // Only enforce transfer limit if user has 5+ players (strategic management)
    // If < 5 players, allow unlimited purchases (emergency rebuild)
    if (currentRosterSize !== null && currentRosterSize >= 5) {
      if (participant.transfers_made_this_week >= allowedTransfers) {
        throw new Error(`Límite de transferencias alcanzado (${allowedTransfers} movimientos/semana).`);
      }
    }
    
    if (participant.current_budget < price) throw new Error(`Presupuesto insuficiente (Necesitas $${(price/1000000).toFixed(1)}M).`);

    // 4. Verificar propiedad (Draft cerrado)
    const { data: existingOwner } = await supabase
      .from("user_rosters")
      .select("profile_id")
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .single();

    if (existingOwner) throw new Error("Este jugador ya tiene equipo.");

    // 5. Verificar tamaño de la plantilla (Max 6: 5 Titulares + 1 Suplente)
    const { count: rosterCount } = await supabase
      .from("user_rosters")
      .select("id", { count: 'exact', head: true })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("is_active", true);
    
    if (rosterCount !== null && rosterCount >= 6) {
        throw new Error("Plantilla completa (Máximo 6 agentes). Vende a alguien antes de fichar.");
    }

    // 5. Registrar transacción
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

    // 5. Verificar tamaño de la plantilla
    // ... (el check existente se mantiene)

    // 6. Determinar si entra como Titular (Auto-Start)
    const { count: starterCount } = await supabase
      .from("user_rosters")
      .select("id", { count: 'exact', head: true })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("is_starter", true);
    
    const isStarter = (starterCount || 0) < 5;

    // 7. Añadir al Roster
    const { error: rError } = await supabase
      .from("user_rosters")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        acquisition_price: price,
        is_active: true,
        is_starter: isStarter,
        release_clause: Math.floor(price * 1.5)
      });

    if (rError) throw rError;

    // 7. Descontar dinero
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
    return { success: true, message: `Has fichado por $${(price/1000000).toFixed(1)}M` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar el fichaje";
    return { success: false, error: message };
  }
}

export async function sellPlayer(leagueId: string, profileId: string, playerId: string) {
  const supabase = await createClient();
  try {
    // 1. Obtener precio actual de mercado
    const { data: playerData, error: plError } = await supabase
        .from('pro_players')
        .select('market_value')
        .eq('id', playerId)
        .single();
    
    if (plError || !playerData) throw new Error("Jugador no encontrado");

    // Sell Tax (10% fee implies receiving 90%)
    const sellPrice = Math.floor(playerData.market_value * 0.9);

    // 2. Verificar bloqueo
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("Mercado cerrado por jornada en curso.");
    }

    // 3. Verificar límites de transferencias
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget, transfers_made_this_week")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("Error verificando usuario.");
    
    // Check SCOUT powerup for extra transfer (reuse activeGw from above)
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

    // Selling also counts towards transfer limit (combined with buys)
    if (participant.transfers_made_this_week >= allowedTransfers) {
      throw new Error(`Límite de transferencias alcanzado (${allowedTransfers} movimientos/semana).`);
    }

    // 4. Eliminar del Roster
    const { error: rError } = await supabase
      .from("user_rosters")
      .delete()
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId);

    if (rError) throw rError;

    // 5. Transacción
    const { error: tError } = await supabase
      .from("market_transactions")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        type: 'sell',
        price: sellPrice
      });

    if (tError) throw tError;

    // 6. Ingresar dinero (90% del valor de mercado) y consumir transferencia
    // Vender AHORA SÍ consume slot de transferencia (cambio de lógica)
    const { error: bError } = await supabase
      .from("league_participants")
      .update({ 
        current_budget: Number(participant.current_budget) + sellPrice,
        transfers_made_this_week: participant.transfers_made_this_week + 1
      })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    if (bError) throw bError;

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: `Vendido por $${(sellPrice/1000000).toFixed(1)}M` };
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

    // 4. Verificar tamaño de plantilla
    const { count: rosterCount } = await supabase
        .from("user_rosters")
        .select("id", { count: 'exact', head: true })
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId)
        .eq("is_active", true);
    
    if (rosterCount !== null && rosterCount >= 6) {
        throw new Error("Plantilla completa. Debes vender a alguien antes de pagar una cláusula.");
    }

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

    // Check Auto-Start
    const { count: starterCount } = await supabase
      .from("user_rosters")
      .select("id", { count: 'exact', head: true })
      .eq("league_id", leagueId)
      .eq("profile_id", buyerProfileId)
      .eq("is_starter", true);
    
    const isStarter = (starterCount || 0) < 5;

    await supabase.from("user_rosters")
        .insert({
            league_id: leagueId,
            profile_id: buyerProfileId,
            player_id: playerId,
            acquisition_price: clausePrice,
            release_clause: newClause,
            is_active: true,
            is_starter: isStarter
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
