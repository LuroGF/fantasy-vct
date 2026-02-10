"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Personal Market: 5 Daily Random Players
export async function getPersonalMarket(leagueId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_or_generate_personal_market', { 
      p_league_id: leagueId, 
      p_profile_id: profileId 
    });

  if (error) {
    console.error("Error fetching personal market:", error);
    return [];
  }

  // Hydrate player data
  const playerIds = data.map((d: any) => d.player_id);
  const { data: players } = await supabase
    .from('pro_players')
    .select('*, pro_teams(tag, name)')
    .in('id', playerIds);

  return data.map((d: any) => ({
    ...d,
    player: players?.find(p => p.id === d.player_id)
  }));
}

export async function buyFromPersonalMarket(leagueId: string, profileId: string, playerId: string, personalMarketId: string) {
  const supabase = await createClient();
  try {
    // 1. Get market entry
    const { data: entry, error: eError } = await supabase
      .from('personal_market')
      .select('*')
      .eq('id', personalMarketId)
      .single();
    
    if (eError || !entry || entry.is_purchased) throw new Error("Oferta no válida o ya comprada.");

    // 2. Buy standard logic but from personal market
    const res = await buyPlayer(leagueId, profileId, playerId, entry.offer_price);
    
    if (res.success) {
      await supabase.from('personal_market').update({ is_purchased: true }).eq('id', personalMarketId);
    }
    
    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Global Auctions
export async function getActiveAuctions(leagueId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('market_auctions')
    .select('*, pro_players(*, pro_teams(tag, name)), profiles!market_auctions_seller_id_fkey(username)')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error("Error fetching auctions:", error);
    return [];
  }
  return data;
}

export async function createAuction(leagueId: string, profileId: string, playerId: string, startingPrice: number) {
  const supabase = await createClient();
  try {
    // 1. Lock Check: Starters cannot be auctioned if locked
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    
    // Check if player is owner and get slot_type
    const { data: roster, error: rError } = await supabase
      .from('user_rosters')
      .select('id, slot_type')
      .eq('league_id', leagueId)
      .eq('profile_id', profileId)
      .eq('player_id', playerId)
      .single();
    
    if (rError || !roster) throw new Error("No posees a este jugador.");

    if (lockStatus.locked && roster.slot_type === 'starter') {
      throw new Error(`Blindaje operacional: Los titulares no pueden ponerse a la venta durante la jornada (${lockStatus.reason}).`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h auction

    const { error } = await supabase
      .from('market_auctions')
      .insert({
        league_id: leagueId,
        seller_id: profileId,
        player_id: playerId,
        starting_price: startingPrice,
        current_bid: startingPrice,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      });
    
    if (error) throw error;
    
    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function placeBid(auctionId: string, profileId: string, bidAmount: number) {
  const supabase = await createClient();
  try {
    const { data: auction, error: aError } = await supabase
      .from('market_auctions')
      .select('*')
      .eq('id', auctionId)
      .single();
    
    if (aError || !auction || auction.status !== 'active') throw new Error("Subasta no disponible.");
    if (bidAmount <= auction.current_bid) throw new Error("Tu puja debe ser superior a la actual.");
    if (auction.seller_id === profileId) throw new Error("No puedes pujar por tu propio jugador.");

    // Check budget
    const { data: participant } = await supabase
      .from('league_participants')
      .select('current_budget')
      .eq('league_id', auction.league_id)
      .eq('profile_id', profileId)
      .single();
    
    if (!participant || participant.current_budget < bidAmount) throw new Error("Presupuesto insuficiente.");

    // 4. ROLE CAPACITY CHECK
    const { data: roster } = await (supabase
      .from("user_rosters")
      .select("slot_type, pro_players(role)")
      .eq("league_id", auction.league_id)
      .eq("profile_id", profileId) as any);
    
    if (roster && roster.length >= 10) throw new Error("No tienes espacio en tu escuadra para más contratos.");
    
    const { data: auctionPlayer } = await supabase.from('pro_players').select('role').eq('id', auction.player_id).single();
    const playerRole = (auctionPlayer?.role || "").trim().toUpperCase();
    
    const starterRolesCount = roster?.filter((r: any) => (r.pro_players as any).role.trim().toUpperCase() === playerRole && r.slot_type === 'starter').length || 0;
    const subRolesCount = roster?.filter((r: any) => (r.pro_players as any).role.trim().toUpperCase() === playerRole && r.slot_type === 'substitute').length || 0;
    
    if (starterRolesCount >= 1 && subRolesCount >= 1) {
        throw new Error(`Cupo de rol completo: Ya tienes 1 titular y 1 suplente de tipo ${playerRole}.`);
    }

    // 5. STAKING LOGIC (Anti-Sabotage)
    const isOverbid = auction.highest_bidder_id === profileId;
    const stakeRequired = isOverbid ? (bidAmount - auction.current_bid) : bidAmount;

    if (participant.current_budget < stakeRequired) throw new Error("Presupuesto insuficiente.");

    // Operation: 1. Deduct from current bidder
    await supabase.from("league_participants")
      .update({ current_budget: participant.current_budget - stakeRequired })
      .eq("league_id", auction.league_id)
      .eq("profile_id", profileId);

    // 2. Refund previous bidder (if it's someone else)
    if (auction.highest_bidder_id && !isOverbid) {
       const { data: prevBidder } = await supabase
         .from("league_participants")
         .select("current_budget")
         .eq("league_id", auction.league_id)
         .eq("profile_id", auction.highest_bidder_id)
         .single();
       
       if (prevBidder) {
         await supabase.from("league_participants")
           .update({ current_budget: prevBidder.current_budget + auction.current_bid })
           .eq("league_id", auction.league_id)
           .eq("profile_id", auction.highest_bidder_id);
       }
    }

    const { error } = await supabase
      .from('market_auctions')
      .update({
        current_bid: bidAmount,
        highest_bidder_id: profileId
      })
      .eq('id', auctionId);
    
    if (error) throw error;

    revalidatePath("/market");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function buyPlayer(leagueId: string, profileId: string, playerId: string, customPrice?: number) {
  const supabase = await createClient();
  try {
    // 1. Get player data
    const { data: playerData, error: plError } = await supabase
        .from('pro_players')
        .select('market_value, role')
        .eq('id', playerId)
        .single();
    
    if (plError || !playerData) throw new Error("Agente no encontrado.");
    
    // 3. Status Checks
    const { data: activeAuction } = await supabase
      .from('market_auctions')
      .select('id')
      .eq('player_id', playerId)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (activeAuction) throw new Error("Este agente está actualmente en una subasta activa.");
    
    const price = customPrice || playerData.market_value;

    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el budget operacional.");
    if (participant.current_budget < price) throw new Error("Presupuesto insuficiente.");

    // 4. Ownership check
    const { data: myOwner } = await supabase
      .from("user_rosters")
      .select("id")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (myOwner) throw new Error("Ya tienes a este agente en tu escuadra.");

    // 6. Real-time Lock Check (Match Day protection)
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    const forcedSub = lockStatus.locked;

    // 7. Auto-assign slot with Role Logic
    const { data: roster } = await (supabase
      .from("user_rosters")
      .select("slot_type, pro_players(role)")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId) as any);
    
    // Count PLAYERS per slot and check ROLES
    const starterPlayers = roster?.filter((r: any) => r.slot_type === 'starter') || [];
    const subPlayers = roster?.filter((r: any) => r.slot_type === 'substitute') || [];
    
    const starterRoles = new Set(starterPlayers.map((r: any) => (r.pro_players as any).role.trim().toUpperCase()));
    const subRoles = new Set(subPlayers.map((r: any) => (r.pro_players as any).role.trim().toUpperCase()));
    
    const startersCount = starterPlayers.length;
    const subsCount = subPlayers.length;
    
    const newPlayerRole = playerData.role.trim().toUpperCase();

    let targetSlot: 'starter' | 'substitute';
    
    // Logic: If locked, ONLY substitute. If open, try starter first.
    if (!forcedSub && startersCount < 5 && !starterRoles.has(newPlayerRole)) {
        targetSlot = 'starter';
    } else if (subsCount < 5 && !subRoles.has(newPlayerRole)) {
        targetSlot = 'substitute';
    } else {
        if (forcedSub) {
           if (subRoles.has(newPlayerRole)) throw new Error(`Mercado bloqueado: Solo puedes fichar para el banquillo y ya tienes un ${playerData.role} suplente.`);
           if (subsCount >= 5) throw new Error("Mercado bloqueado: Solo puedes fichar para el banquillo y ya tienes 5 suplentes.");
        }
        
        const hasInStarter = starterRoles.has(newPlayerRole);
        const hasInSub = subRoles.has(newPlayerRole);
        
        if (hasInStarter && hasInSub) {
            throw new Error(`Ya tienes un ${playerData.role} en titulares y suplentes. Máximo 2 por rol (1 titular + 1 suplente).`);
        }
        
        if (startersCount >= 5 && subsCount >= 5) {
            throw new Error("Plantilla completa (10 jugadores). Debes vender a alguien primero.");
        }

        throw new Error(`No se puede asignar hueco para ${playerData.role}. Verifica que no tengas ya ese rol en el slot objetivo.`);
    }

    // 8. Add to Roster
    const { error: rError } = await supabase
      .from("user_rosters")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        acquisition_price: price,
        is_active: true,
        slot_type: targetSlot,
        is_starter: targetSlot === 'starter',
        release_clause: Math.floor(price * 1.5)
      });

    if (rError) throw rError;

    // 9. Update Budget
    await supabase.from("league_participants")
      .update({ current_budget: Number(participant.current_budget) - price })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    // 10. Increment Transfers
    await supabase.rpc('increment_transfers', { p_league_id: leagueId, p_profile_id: profileId });

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sellPlayer(leagueId: string, profileId: string, playerId: string) {
  const supabase = await createClient();
  try {
    const { data: playerData } = await supabase
        .from('pro_players')
        .select('market_value')
        .eq('id', playerId)
        .single();
    
    if (!playerData) throw new Error("Agente no encontrado.");
    const sellPrice = Math.floor(playerData.market_value * 0.9);

    // 1. Lock Check
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);

    // Check if player is starter
    const { data: playerRoster } = await supabase.from('user_rosters').select('slot_type').eq('league_id', leagueId).eq('profile_id', profileId).eq('player_id', playerId).single();

    if (lockStatus.locked && playerRoster?.slot_type === 'starter') {
      throw new Error(`Blindaje operacional: Los titulares no se pueden vender durante la jornada (${lockStatus.reason}).`);
    }

    const { data: participant } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    // Cancel active auctions and refund the bidder
    const { data: activeAuctions } = await supabase.from('market_auctions')
      .select('id, highest_bidder_id, current_bid')
      .eq('league_id', leagueId)
      .eq('player_id', playerId)
      .eq('seller_id', profileId)
      .eq('status', 'active');

    if (activeAuctions) {
      for (const auct of activeAuctions) {
        if (auct.highest_bidder_id) {
          // Refund
          const { data: bidder } = await supabase.from('league_participants').select('current_budget').eq('league_id', leagueId).eq('profile_id', auct.highest_bidder_id).single();
          if (bidder) {
            await supabase.from('league_participants').update({ current_budget: bidder.current_budget + auct.current_bid }).eq('league_id', leagueId).eq('profile_id', auct.highest_bidder_id);
          }
        }
        await supabase.from('market_auctions').update({ status: 'canceled' }).eq('id', auct.id);
      }
    }

    // Remove from Roster
    await supabase.from("user_rosters")
      .delete()
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId);

    // Register Transaction
    await supabase.from("market_transactions").insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        type: 'sell',
        price: sellPrice
    });

    // Update Budget
    if (participant) {
      await supabase.from("league_participants")
        .update({ current_budget: Number(participant.current_budget) + sellPrice })
        .eq("league_id", leagueId)
        .eq("profile_id", profileId);
    }

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function payClause(leagueId: string, buyerProfileId: string, playerId: string, targetProfileId: string) {
  const supabase = await createClient();
  try {
    // 1. Check if buyer already owns the player
    const { data: myRoster } = await supabase
      .from("user_rosters")
      .select("id")
      .eq("league_id", leagueId)
      .eq("profile_id", buyerProfileId)
      .eq("player_id", playerId)
      .single();
    
    if (myRoster) throw new Error("Ya tienes a este agente en tu escuadra.");

    // 2. Get target's roster entry
    const { data: rosterEntry, error: rError } = await supabase
      .from("user_rosters")
      .select(`
        profile_id,
        release_clause,
        pro_players!inner (nickname, market_value, role)
      `)
      .eq("league_id", leagueId)
      .eq("player_id", playerId)
      .eq("profile_id", targetProfileId)
      .single();

    if (rError || !rosterEntry) throw new Error("Este agente no pertenece a la escuadra seleccionada.");

    // Check if player is in an active auction BY THIS SELLER
    const { data: activeAuction } = await supabase
      .from('market_auctions')
      .select('id')
      .eq('player_id', playerId)
      .eq('league_id', leagueId)
      .eq('seller_id', targetProfileId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (activeAuction) throw new Error("Protocolo de rescisión bloqueado: el agente está en una subasta activa de este propietario.");

    const ownerId = rosterEntry.profile_id;
    const clausePrice = rosterEntry.release_clause || 0;

    // --- NEW LOGIC: PROTECTIONS ---
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    
    // 1. Lineup Lock: If user is starter and market is locked, cannot be clause-snatched
    if (lockStatus.locked && (rosterEntry as any).slot_type === 'starter') {
        throw new Error(`Agente blindado: los titulares no pueden ser clausulados durante la jornada (${lockStatus.reason}).`);
    }

    const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).single();
    
    // 2. Power-up LOCK: Check if protected by item
    const { data: lockActive } = await supabase
        .from('active_powerups')
        .select(`
          id,
          powerup_types!inner (
            code
          )
        `)
        .eq('league_id', leagueId)
        .eq('target_player_id', playerId)
        .eq('gameweek_id', activeGw?.id)
        .eq('powerup_types.code', 'LOCK')
        .maybeSingle();
    
    if (lockActive) throw new Error("Operación fallida: el agente tiene un Protocolo de Bloqueo (Candado) activo.");

    const { data: buyer } = await supabase
        .from("league_participants")
        .select("current_budget")
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId)
        .single();
    
    if (!buyer || Number(buyer.current_budget) < Number(clausePrice)) throw new Error("Presupuesto insuficiente para rescisión.");

    // Check Capacity
    const { count: totalCount } = await supabase.from("user_rosters").select("id", { count: 'exact', head: true }).eq("league_id", leagueId).eq("profile_id", buyerProfileId);
    if (totalCount !== null && totalCount >= 10) throw new Error("Plantilla completa (10 jugadores). Vende antes de clausular.");

    // Execution
    await supabase.from("league_participants")
        .update({ current_budget: Number(buyer.current_budget) - Number(clausePrice) })
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId);

    const { data: owner } = await supabase.from("league_participants").select("current_budget").eq("league_id", leagueId).eq("profile_id", ownerId).single();
    if (owner) {
        await supabase.from("league_participants")
            .update({ current_budget: Number(owner.current_budget) + Number(clausePrice) })
            .eq("league_id", leagueId)
            .eq("profile_id", ownerId);
    }

    await supabase.from("user_rosters").delete().eq("league_id", leagueId).eq("player_id", playerId).eq("profile_id", ownerId);
    
    // Auto-assign slot with proper role and lock logic
    const { data: roster } = await (supabase
        .from("user_rosters")
        .select("slot_type, pro_players(role)")
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId) as any);
    
    const starterPlayers = roster?.filter((r: any) => r.slot_type === 'starter') || [];
    const subPlayers = roster?.filter((r: any) => r.slot_type === 'substitute') || [];
    
    const starterRoles = new Set(starterPlayers.map((r: any) => (r.pro_players as any).role.trim().toUpperCase()));
    const subRoles = new Set(subPlayers.map((r: any) => (r.pro_players as any).role.trim().toUpperCase()));
    
    const startersCount = starterPlayers.length;
    const subsCount = subPlayers.length;
    const newPlayerRole = (rosterEntry.pro_players as any).role.trim().toUpperCase();
    const forcedSub = lockStatus.locked;

    let targetSlot: 'starter' | 'substitute';

    if (!forcedSub && startersCount < 5 && !starterRoles.has(newPlayerRole)) {
        targetSlot = 'starter';
    } else if (subsCount < 5 && !subRoles.has(newPlayerRole)) {
        targetSlot = 'substitute';
    } else {
        if (forcedSub) throw new Error(`Mercado bloqueado: Solo puedes clausular para el banquillo y ya tienes un ${(rosterEntry.pro_players as any).role} suplente.`);
        throw new Error(`Configuración de roles no permitida: Ya tienes un ${(rosterEntry.pro_players as any).role} en titulares y suplentes.`);
    }

    // Cancel any active auctions of this player from this owner and refund bidder
    const { data: ownerAuctions } = await supabase.from('market_auctions')
        .select('id, highest_bidder_id, current_bid')
        .eq('league_id', leagueId)
        .eq('player_id', playerId)
        .eq('seller_id', ownerId)
        .eq('status', 'active');

    if (ownerAuctions) {
        for (const auct of ownerAuctions) {
            if (auct.highest_bidder_id) {
                const { data: bidder } = await supabase.from('league_participants').select('current_budget').eq('league_id', leagueId).eq('profile_id', auct.highest_bidder_id).single();
                if (bidder) {
                    await supabase.from('league_participants').update({ current_budget: bidder.current_budget + auct.current_bid }).eq('league_id', leagueId).eq('profile_id', auct.highest_bidder_id);
                }
            }
            await supabase.from('market_auctions').update({ status: 'canceled' }).eq('id', auct.id);
        }
    }

    await supabase.from("user_rosters").insert({
        league_id: leagueId,
        profile_id: buyerProfileId,
        player_id: playerId,
        acquisition_price: clausePrice,
        release_clause: Math.floor(Number(clausePrice) * 1.5),
        is_active: true,
        slot_type: targetSlot,
        is_starter: targetSlot === 'starter'
    });

    await supabase.from("market_transactions").insert({
        league_id: leagueId,
        profile_id: buyerProfileId,
        player_id: playerId,
        type: 'clause_paid',
        price: clausePrice
    });

    const { createNotification } = await import("./notifications");
    await createNotification({
      profile_id: ownerId,
      league_id: leagueId,
      title: "🚨 BAJA POR CLÁUSULA",
      message: `Han pagado la cláusula de $${(clausePrice / 1000000).toFixed(1)}M por ${(rosterEntry.pro_players as any).nickname}.`,
      type: "hostile_buy"
    });

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resuelve las subastas que han expirado.
 * Esta función es crítica y debe llamarse desde un Cron job (ej: cada 5-10 mins).
 */
export async function resolveExpiredAuctions() {
  const { supabaseAdmin } = await import("@/utils/supabase/admin");
  console.log("Resolving expired auctions...");
  
  try {
    const { data: expiredAuctions, error } = await supabaseAdmin
      .from('market_auctions')
      .select(`
        *,
        seller:profiles!market_auctions_seller_id_fkey(username),
        bidder:profiles!highest_bidder_id_fkey(username),
        pro_players(nickname, role)
      `)
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString());

    if (error) throw error;
    if (!expiredAuctions || expiredAuctions.length === 0) return { success: true, count: 0 };

    // Group auctions by player and then by bidder to handle multi-wins
    // But easier: Sort by price DESC so we process more expensive ones first
    const sortedAuctions = [...expiredAuctions].sort((a, b) => b.current_bid - a.current_bid);
    
    // Track who already got which player in this transaction batch
    const batchProcessed = new Set<string>(); // "bidderId_playerId"

    for (const auct of sortedAuctions) {
      if (!auct.highest_bidder_id) {
        await (supabaseAdmin.from('market_auctions') as any).update({ status: 'expired' }).eq('id', auct.id);
        continue;
      }

      const playerKey = `${auct.highest_bidder_id}_${auct.player_id}`;

      // 1. REFUND LOGIC IF CANCELED
      const cancelAndRefund = async (reason: string) => {
          console.log(`Auction ${auct.id} canceled: ${reason}`);
          if (auct.highest_bidder_id) {
            const { data: bidder } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.highest_bidder_id).single();
            if (bidder) {
              await supabaseAdmin.from('league_participants').update({ current_budget: bidder.current_budget + auct.current_bid }).eq('league_id', auct.league_id).eq('profile_id', auct.highest_bidder_id);
            }
          }
          await (supabaseAdmin.from('market_auctions') as any).update({ status: 'canceled' }).eq('id', auct.id);
      };

      // Check if this bidder already won this player in a more expensive auction in THIS batch
      if (batchProcessed.has(playerKey)) {
          await cancelAndRefund("Processing cheaper duplicate entry");
          continue;
      }

      // EXECUTE SALE (Money already deducted from bidder during placeBid)
      
      // Double check winner doesn't ALREADY own the player (from a previous day or resolve)
      const { data: existing } = await supabaseAdmin.from('user_rosters').select('id').eq('league_id', auct.league_id).eq('profile_id', auct.highest_bidder_id).eq('player_id', auct.player_id).maybeSingle();
      if (existing) {
          await cancelAndRefund("Bidder already owns player");
          continue;
      }

      // 2. Pay seller
      const { data: seller } = await (supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id) as any).single();
      if (seller) {
          await supabaseAdmin.from('league_participants').update({ current_budget: Number(seller.current_budget) + Number(auct.current_bid) }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
      }

      // 3. Move player
      await supabaseAdmin.from('user_rosters').delete().eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).eq('player_id', auct.player_id);
      
      // Assign slot for bidder
      const { data: bidderRoster } = await (supabaseAdmin.from('user_rosters').select('slot_type, pro_players(role)').eq('league_id', auct.league_id).eq('profile_id', auct.highest_bidder_id) as any);
      
      const role = (auct.pro_players as any).role.trim().toUpperCase();
      const starterFull = (bidderRoster as any[])?.some(r => r.slot_type === 'starter' && (r.pro_players as any).role.trim().toUpperCase() === role);
      
      // Check if market is locked (Auction resolution happens via Cron, which should handle forced slots?)
      // We'll use getMarketLockStatus helper too
      const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
      const lockStatus = await getMarketLockStatus(supabaseAdmin);
      
      let targetSlot: 'starter' | 'substitute' = (starterFull || lockStatus.locked) ? 'substitute' : 'starter';

      await supabaseAdmin.from('user_rosters').insert({
          league_id: auct.league_id,
          profile_id: auct.highest_bidder_id,
          player_id: auct.player_id,
          acquisition_price: auct.current_bid,
          release_clause: Math.floor(auct.current_bid * 1.5),
          slot_type: targetSlot,
          is_starter: targetSlot === 'starter',
          is_active: true
      });

      batchProcessed.add(playerKey);

      // 4. Update Auction status
      await (supabaseAdmin.from('market_auctions') as any).update({ status: 'sold' }).eq('id', auct.id);

      // 5. Notifications
      const { createNotification } = await import("./notifications");
      await createNotification({
          profile_id: auct.seller_id,
          league_id: auct.league_id,
          title: "💰 AGENTE VENDIDO",
          message: `Has vendido a ${auct.pro_players.nickname} por $${(auct.current_bid / 1000000).toFixed(1)}M.`,
          type: "sale"
      });
      await createNotification({
          profile_id: auct.highest_bidder_id,
          league_id: auct.league_id,
          title: "✅ SUBASTA GANADA",
          message: `Has ganado la subasta de ${auct.pro_players.nickname} por $${(auct.current_bid / 1000000).toFixed(1)}M.`,
          type: "buy"
      });
    }

    return { success: true, count: expiredAuctions.length };
  } catch (error: any) {
      console.error("Error resolving auctions:", error);
      return { success: false, error: error.message };
  }
}

