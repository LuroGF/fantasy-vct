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
    player: players?.find((p: any) => p.id === d.player_id)
  }));
}

// Legendary Players: Only for Finals
export async function getLegendaryPlayers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pro_players')
    .select('*, pro_teams(tag, name)')
    .eq('is_legend', true);

  if (error) {
    console.error("Error fetching legendary players:", error);
    return [];
  }
  return data;
}

export async function checkIsFinal(leagueId: string) {
  const supabase = await createClient();
  
  // 1. Check if ANY gameweek is marked as is_final
  const { data: finalGw } = await supabase
    .from('gameweeks')
    .select('id')
    .eq('is_active', true)
    .eq('is_final', true)
    .maybeSingle();
  
  if (finalGw) return true;

  // 2. Logic fallback: more than  match this week?
  const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).maybeSingle();
  if (!activeGw) return false;

  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('gameweek_id', activeGw.id);

  return count === 1;
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
    
    // FIX Bug #12: Check is_purchased BEFORE attempting to buy
    if (eError || !entry) throw new Error("Oferta no encontrada.");
    if (entry.is_purchased) throw new Error("Esta oferta ya fue comprada.");

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
export async function fetchActiveAuctions(leagueId: string, profileId?: string) {
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

  // Hydrate with reveal status if profileId is provided
  if (profileId) {
    const { data: reveals } = await supabase
      .from('auction_reveals')
      .select('auction_id')
      .eq('profile_id', profileId);
    
    const revealSet = new Set(reveals?.map((r: any) => r.auction_id));
    return data.map((a: { id: unknown; }) => ({
      ...a,
      is_revealed: revealSet.has(a.id) as any
    }));
  }

  return data;
}

export async function revealAuction(leagueId: string, profileId: string, auctionId: string) {
  const supabase = await createClient();
  try {
    // 1. Get Spy Eye Power-up Info
    const { data: spyType } = await supabase
      .from('powerup_types')
      .select('id')
      .eq('code', 'SPY')
      .single();
    
    if (!spyType) throw new Error("Objeto 'Ojo del Espía' no configurado.");

    // 2. Check Inventory
    const { data: inventory, error: invError } = await supabase
      .from('user_inventory')
      .select('id, quantity')
      .eq('league_id', leagueId)
      .eq('profile_id', profileId)
      .eq('powerup_type_id', spyType.id)
      .gt('quantity', 0)
      .single();
    
    if (invError || !inventory) throw new Error("No tienes el objeto 'Ojo del Espía' en tu inventario.");

    // 3. Confirm reveal record doesn't exist
    const { data: existing } = await supabase
      .from('auction_reveals')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('profile_id', profileId)
      .maybeSingle();
    
    if (existing) throw new Error("Ya has revelado esta subasta.");

    // FIX Bug #10: Validate auction is still active and not expired
    const { data: auctionData } = await supabase
      .from('market_auctions')
      .select('expires_at, status')
      .eq('id', auctionId)
      .single();

    if (!auctionData || auctionData.status !== 'active') {
      throw new Error("La subasta ya no está activa.");
    }

    if (new Date(auctionData.expires_at) < new Date()) {
      throw new Error("La subasta ya expiró.");
    }

    // 4. Consume Item
    await supabase.from('user_inventory').update({ quantity: inventory.quantity - 1 }).eq('id', inventory.id);

    // 5. Create Reveal
    const { error: revError } = await supabase
      .from('auction_reveals')
      .insert({ auction_id: auctionId, profile_id: profileId });
    
    if (revError) throw revError;

    revalidatePath("/market");
    return { success: true, message: "Puja revelada con éxito." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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

    // NEW: Check if this seller ALREADY has an active auction for this specific player
    const { data: existingAuction } = await supabase
      .from('market_auctions')
      .select('id')
      .eq('league_id', leagueId)
      .eq('seller_id', profileId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingAuction) {
      throw new Error("Ya tienes una subasta activa para este agente.");
    }

    if (lockStatus.locked && roster.slot_type === 'starter') {
      throw new Error(`Blindaje operacional: Los titulares no pueden reasignarse durante la jornada (${lockStatus.reason}).`);
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
    if (auction.seller_id === profileId) throw new Error("No puedes pujar por tu propio jugador.");

    // 0. Market Lock Check
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    if (lockStatus.locked) {
        throw new Error(`Puja bloqueada: ${lockStatus.reason}.`);
    }

    // NEW: Check if user already owns the player (prevent duplicate bidding)
    const { data: alreadyOwned } = await supabase
      .from('user_rosters')
      .select('id')
      .eq('league_id', auction.league_id)
      .eq('profile_id', profileId)
      .eq('player_id', auction.player_id)
      .maybeSingle();
    
    if (alreadyOwned) throw new Error("Ya tienes a este agente en tu escuadra.");
    
    // BLIND BIDDING: We don't throw error if bid is lower, we just record it 
    // but the system only updates the leader if truly higher.
    const isActuallyHigher = bidAmount > auction.current_bid;

    // 1. Get participant's total budget
    const { data: participant } = await supabase
      .from('league_participants')
      .select('current_budget')
      .eq('league_id', auction.league_id)
      .eq('profile_id', profileId)
      .single();
    
    if (!participant) throw new Error("No se encontró tu perfil en la liga.");

    // 2. Calculate "Committed Funds" (money already tied up in other auctions)
    const { data: committedBids } = await supabase
      .from('user_bids')
      .select('bid_amount, auction_id, market_auctions!inner(status)')
      .eq('profile_id', profileId)
      .eq('market_auctions.status', 'active')
      .neq('auction_id', auctionId);
    
    const committedFunds = committedBids?.reduce((sum: number, b: any) => sum + Number(b.bid_amount), 0) || 0;
    const availableBudget = Number(participant.current_budget) - committedFunds;

    if (availableBudget < bidAmount) {
      throw new Error(`Fondos insuficientes. Tienes ${(committedFunds / 1000000).toFixed(1)} CREDS bloqueados en otras asignaciones.`);
    }

    // 3. CAPACITY CHECK
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

    // 4. Update the auction ONLY if it's truly higher
    if (isActuallyHigher) {
        const { error } = await supabase
          .from('market_auctions')
          .update({
            current_bid: bidAmount,
            highest_bidder_id: profileId
          })
          .eq('id', auctionId);
        
        if (error) throw error;
    }
    
    // 5. Always record the user's personal bid to track committed funds
    const { error: bidError } = await supabase
      .from('user_bids')
      .upsert({ 
        auction_id: auctionId, 
        profile_id: profileId, 
        bid_amount: bidAmount 
      }, { onConflict: 'auction_id,profile_id' });

    if (bidError) throw bidError;

    revalidatePath("/market");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function withdrawBid(auctionId: string, profileId: string) {
  const supabase = await createClient();
  try {
    // 1. Get current auction state to see if we are leader
    const { data: auction } = await supabase
        .from('market_auctions')
        .select('highest_bidder_id, starting_price')
        .eq('id', auctionId)
        .single();

    // 2. Delete the bid
    const { error: deleteError } = await supabase
      .from('user_bids')
      .delete()
      .eq('auction_id', auctionId)
      .eq('profile_id', profileId);
    
    if (deleteError) throw deleteError;

    // 3. Fallback logic: if we were the leader, find the next one
    if (auction?.highest_bidder_id === profileId) {
        const { data: nextBid } = await supabase
            .from('user_bids')
            .select('bid_amount, profile_id')
            .eq('auction_id', auctionId)
            .order('bid_amount', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (nextBid) {
            await supabase.from('market_auctions').update({
                current_bid: nextBid.bid_amount,
                highest_bidder_id: nextBid.profile_id
            }).eq('id', auctionId);
        } else {
            await supabase.from('market_auctions').update({
                current_bid: auction.starting_price,
                highest_bidder_id: null
            }).eq('id', auctionId);
        }
    }

    revalidatePath("/market");
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
        .select('market_value, nickname')
        .eq('id', playerId)
        .single();
    
    if (!playerData) throw new Error("Agente no detectado.");
    const sellPrice = Math.floor(playerData.market_value * 0.9);

    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    const { data: playerRoster } = await supabase.from('user_rosters').select('slot_type').eq('league_id', leagueId).eq('profile_id', profileId).eq('player_id', playerId).single();

    if (lockStatus.locked && playerRoster?.slot_type === 'starter') {
      throw new Error(`Blindaje operacional: Los titulares no se pueden liberar durante la jornada.`);
    }

    const { data: result, error: rpcError } = await supabase.rpc('handle_sell_player', {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_player_id: playerId,
        p_price: sellPrice
    });

    if (rpcError) throw new Error("Error al procesar la baja del agente.");
    if (!result?.success) throw new Error(result?.message || "No se pudo completar la venta.");

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");
    return { success: true, message: `${playerData.nickname} ha sido liberado. (+${(sellPrice/1000000).toFixed(1)}M VP)` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function payClause(leagueId: string, buyerProfileId: string, playerId: string, targetProfileId: string) {
  const supabase = await createClient();
  try {
    const [
      { data: myRoster },
      { data: rosterEntry, error: rError },
      { data: buyer },
      { data: activeGw }
    ] = await Promise.all([
      supabase.from("user_rosters").select("id").eq("league_id", leagueId).eq("profile_id", buyerProfileId).eq("player_id", playerId).maybeSingle(),
      supabase.from("user_rosters").select("*, pro_players!inner(*)").eq("league_id", leagueId).eq("player_id", playerId).eq("profile_id", targetProfileId).single(),
      supabase.from("league_participants").select("*").eq("league_id", leagueId).eq("profile_id", buyerProfileId).single(),
      supabase.from('gameweeks').select('id').eq('is_active', true).maybeSingle()
    ]);
    
    if (myRoster) throw new Error("Ya posees a este agente.");
    if (rError || !rosterEntry) throw new Error("El agente ya no pertenece a ese rival.");
    if (!buyer) throw new Error("No se encontró tu perfil en la liga.");

    const marketValue = rosterEntry.pro_players?.market_value || 0;
    const clausePrice = Math.max(rosterEntry.release_clause || 0, marketValue * 1.25);
    
    if (clausePrice <= 0) throw new Error("Error: El agente no tiene valor de mercado.");

    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    if (lockStatus.locked && rosterEntry.slot_type === 'starter') {
        throw new Error("Blindaje: Los titulares están protegidos durante la jornada.");
    }

    const { data: lockActive } = await supabase.from('active_powerups').select('id').eq('league_id', leagueId).eq('target_player_id', playerId).eq('gameweek_id', activeGw?.id).maybeSingle();
    if (lockActive) throw new Error("El agente tiene un Protocolo de Bloqueo activo.");

    if (Number(buyer.current_budget) < clausePrice) throw new Error("Recursos insuficientes.");

    // Transactional logic
    const { error: buyErr } = await supabase.from("league_participants").update({ current_budget: Number(buyer.current_budget) - clausePrice }).eq("league_id", leagueId).eq("profile_id", buyerProfileId);
    if (buyErr) throw buyErr;

    const { data: seller } = await supabase.from("league_participants").select("current_budget").eq("league_id", leagueId).eq("profile_id", targetProfileId).single();
    if (seller) {
        await supabase.from("league_participants").update({ current_budget: Number(seller.current_budget) + clausePrice }).eq("league_id", leagueId).eq("profile_id", targetProfileId);
    }

    await supabase.from("user_rosters").delete().eq("league_id", leagueId).eq("player_id", playerId).eq("profile_id", targetProfileId);
    
    const { error: instErr } = await supabase.from("user_rosters").insert({
        league_id: leagueId,
        profile_id: buyerProfileId,
        player_id: playerId,
        acquisition_price: clausePrice,
        release_clause: Math.floor(clausePrice * 1.5),
        slot_type: 'substitute',
        is_starter: false
    });
    if (instErr) throw instErr;

    await supabase.from("market_transactions").insert({ league_id: leagueId, profile_id: buyerProfileId, player_id: playerId, type: 'clause_paid', price: clausePrice });

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: `Has reclutado a ${rosterEntry.pro_players.nickname}.` };
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
        .select('market_value, role, nickname')
        .eq('id', playerId)
        .single();
    
    if (plError || !playerData) throw new Error("Agente no encontrado.");
    
    const price = customPrice || playerData.market_value;

    const { data: participant } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (!participant || Number(participant.current_budget) < price) {
      throw new Error("Fondos insuficientes.");
    }

    // 2. Real-time Lock Check
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);

    // 3. Transact via RPC for atomicity
    const { data: result, error: rpcError } = await supabase.rpc('handle_buy_player', {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_player_id: playerId,
        p_price: price
    });

    if (rpcError) throw new Error("Error en la transmisión de datos al servidor.");
    if (!result?.success) throw new Error(result?.message || "La compra no pudo completarse.");

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");
    return { success: true, message: `Reclutamiento exitoso: ${playerData.nickname} se une a la escuadra.` };
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
        bidder:profiles!market_auctions_highest_bidder_id_fkey(username),
        pro_players(nickname, role)
      `)
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString());

    if (error) throw error;
    if (!expiredAuctions || expiredAuctions.length === 0) return { success: true, count: 0 };

    // Group auctions by player and then by bidder to handle multi-wins
    const sortedAuctions = [...expiredAuctions].sort((a, b) => b.current_bid - a.current_bid);
    
    // --- PHASE 1: CLEAR SLOTS ---
    for (const auct of sortedAuctions) {
       await supabaseAdmin.from('user_rosters')
        .delete()
        .eq('league_id', auct.league_id)
        .eq('profile_id', auct.seller_id)
        .eq('player_id', auct.player_id);
    }

    // --- PHASE 2: CASCADING RESOLUTION ---
    for (const auct of sortedAuctions) {
      const { data: allBids } = await supabaseAdmin
        .from('user_bids')
        .select('*')
        .eq('auction_id', auct.id)
        .order('bid_amount', { ascending: false });

      let auctionResolved = false;

      if (allBids && allBids.length > 0) {
        for (const bid of allBids) {
            const { count: currentTotalPlayers } = await supabaseAdmin.from('user_rosters').select('id', { count: 'exact', head: true }).eq('league_id', auct.league_id).eq('profile_id', bid.profile_id);
            if (currentTotalPlayers !== null && currentTotalPlayers >= 10) continue;

            const { data: userRoster } = await (supabaseAdmin.from('user_rosters').select('slot_type, pro_players(role)').eq('league_id', auct.league_id).eq('profile_id', bid.profile_id) as any);
            const role = auct.pro_players.role.trim().toUpperCase();
            const roleCount = userRoster?.filter((r: any) => r.pro_players.role.trim().toUpperCase() === role).length || 0;
            
            if (roleCount >= 2) continue;

            const { data: bidderPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', bid.profile_id).single();
            if (!bidderPart || Number(bidderPart.current_budget) < Number(bid.bid_amount)) continue; 

            // SUCCESS: Execute Transfer
            await supabaseAdmin.from('league_participants').update({ current_budget: Number(bidderPart.current_budget) - Number(bid.bid_amount) }).eq('league_id', auct.league_id).eq('profile_id', bid.profile_id);
            const { data: sellerPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).single();
            if (sellerPart) {
                await supabaseAdmin.from('league_participants').update({ current_budget: Number(sellerPart.current_budget) + Number(bid.bid_amount) }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
            }
            
            const starterExists = userRoster?.some((r: any) => r.slot_type === 'starter' && r.pro_players.role.trim().toUpperCase() === role);
            const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
            const lockStatus = await getMarketLockStatus(supabaseAdmin);
            const targetSlot = (!lockStatus.locked && !starterExists) ? 'starter' : 'substitute';

            await supabaseAdmin.from('user_rosters').insert({
                league_id: auct.league_id,
                profile_id: bid.profile_id,
                player_id: auct.player_id,
                acquisition_price: bid.bid_amount,
                release_clause: Math.floor(bid.bid_amount * 1.5),
                slot_type: targetSlot,
                is_starter: targetSlot === 'starter',
                is_active: true
            });

            const { createNotification } = await import("./notifications");
            await createNotification({ profile_id: auct.seller_id, league_id: auct.league_id, title: "📋 AGENTE TRANSFERIDO", message: `Transferido: ${auct.pro_players.nickname} por ${(bid.bid_amount / 1000000).toFixed(1)}M VP.`, type: "sale" });
            await createNotification({ profile_id: bid.profile_id, league_id: auct.league_id, title: "✅ ASIGNACIÓN EXITOSA", message: `Agente asignado: ${auct.pro_players.nickname} por ${(bid.bid_amount / 1000000).toFixed(1)}M VP.`, type: "buy" });

            auctionResolved = true;
            break;
        }
      }

      if (!auctionResolved) {
          const bankPrice = Math.floor(Number(auct.pro_players.market_value || 10000000) * 0.8);
          const { data: sPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).single();
          if (sPart) {
              await supabaseAdmin.from('league_participants').update({ current_budget: Number(sPart.current_budget) + bankPrice }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
          }
          const { createNotification } = await import("./notifications");
          await createNotification({ profile_id: auct.seller_id, league_id: auct.league_id, title: "🔄 RETORNO A BASE", message: `Sin asignaciones válidas por ${auct.pro_players.nickname}. Retorno compensado: ${(bankPrice / 1000000).toFixed(1)}M VP.`, type: "sale" });
      }

      await (supabaseAdmin.from('market_auctions') as any).update({ status: 'sold' }).eq('id', auct.id);
      await supabaseAdmin.from('user_bids').delete().eq('auction_id', auct.id);
    }

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");

    return { success: true, count: expiredAuctions.length };
  } catch (error: any) {
    console.error("Error resolving auctions:", error);
    return { success: false, error: error.message };
  }
}
