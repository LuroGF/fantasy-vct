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
export async function getActiveAuctions(leagueId: string, profileId?: string) {
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
    
    const revealSet = new Set(reveals?.map(r => r.auction_id));
    return data.map(a => ({
      ...a,
      is_revealed: revealSet.has(a.id)
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
    if (auction.seller_id === profileId) throw new Error("No puedes pujar por tu propio jugador.");

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
    
    const committedFunds = committedBids?.reduce((sum, b) => sum + Number(b.bid_amount), 0) || 0;
    const availableBudget = Number(participant.current_budget) - committedFunds;

    if (availableBudget < bidAmount) {
      throw new Error(`Presupuesto insuficiente. Tienes $${(committedFunds / 1000000).toFixed(1)}M bloqueados en otras subastas.`);
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
      .select("current_budget, transfers_made_this_week")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el budget operacional.");
    


    // NEW: Check Committed Funds (money blocked in active auctions)
    const { data: committedBids } = await supabase
      .from('user_bids')
      .select('bid_amount, market_auctions!inner(status)')
      .eq('profile_id', profileId)
      .eq('market_auctions.status', 'active');
    
    const committedFunds = committedBids?.reduce((sum, b) => sum + Number(b.bid_amount), 0) || 0;
    const availableBudget = Number(participant.current_budget) - committedFunds;

    if (availableBudget < price) {
      throw new Error(`Presupuesto insuficiente. Tienes $${(committedFunds / 1000000).toFixed(1)}M bloqueados en subastas.`);
    }

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

    // We don't block anymore (removed throw). We record it to cancel it later.

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
        .select("current_budget, transfers_made_this_week")
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId)
        .single();
    
    if (!buyer || Number(buyer.current_budget) < Number(clausePrice)) throw new Error("Presupuesto insuficiente para rescisión.");



    // NEW: Check Committed Funds (money blocked in active auctions)
    const { data: committedBids } = await supabase
      .from('user_bids')
      .select('bid_amount, market_auctions!inner(status)')
      .eq('profile_id', buyerProfileId)
      .eq('market_auctions.status', 'active');
    
    const committedFunds = committedBids?.reduce((sum, b) => sum + Number(b.bid_amount), 0) || 0;
    const availableBudget = Number(buyer.current_budget) - committedFunds;

    if (availableBudget < Number(clausePrice)) {
      throw new Error(`Presupuesto insuficiente para rescisión. Tienes $${(committedFunds / 1000000).toFixed(1)}M bloqueados en subastas.`);
    }

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

    // Cancel any active auctions of this player from this owner and release blocked budgets
    const { data: ownerAuctions } = await supabase.from('market_auctions')
        .select('id')
        .eq('league_id', leagueId)
        .eq('player_id', playerId)
        .eq('seller_id', ownerId)
        .eq('status', 'active');

    if (ownerAuctions) {
        for (const auct of ownerAuctions) {
            // 1. Mark auction as canceled
            await supabase.from('market_auctions').update({ status: 'canceled' }).eq('id', auct.id);
            
            // 2. Notify all bidders before deleting their records
            const { data: bidders } = await supabase.from('user_bids').select('profile_id').eq('auction_id', auct.id);
            if (bidders) {
                const { createNotification } = await import("./notifications");
                for (const b of bidders) {
                    await createNotification({
                        profile_id: b.profile_id,
                        league_id: leagueId,
                        title: "⚠️ SUBASTA CANCELADA",
                        message: `La subasta de ${(rosterEntry.pro_players as any).nickname} ha sido cancelada porque alguien pagó su cláusula de rescisión.`,
                        type: "system"
                    });
                }
            }

            // 3. Delete all bids to unblock budgets
            await supabase.from('user_bids').delete().eq('auction_id', auct.id);
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
    
    // Increment Transfers
    await supabase.rpc('increment_transfers', { p_league_id: leagueId, p_profile_id: buyerProfileId });

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
        bidder:profiles!market_auctions_highest_bidder_id_fkey(username),
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

    // --- PHASE 1: CLEAR SLOTS & PAY SELLERS MINIMUM ---
    // We remove players from sellers first so their slots are free for their own potential purchases in this batch.
    for (const auct of sortedAuctions) {
       console.log(`Phase 1: Clearing seller ${auct.seller_id} for ${auct.pro_players.nickname}`);
       await supabaseAdmin.from('user_rosters')
        .delete()
        .eq('league_id', auct.league_id)
        .eq('profile_id', auct.seller_id)
        .eq('player_id', auct.player_id);
       
       // Note: We don't pay the full price yet, because we don't know if a bidder or bank will be the final source.
       // But the slot is now FREE for the seller.
    }

    // --- PHASE 2: CASCADING RESOLUTION ---
    for (const auct of sortedAuctions) {
      console.log(`Phase 2: Resolving ${auct.pro_players.nickname}`);

      const { data: allBids } = await supabaseAdmin
        .from('user_bids')
        .select('*')
        .eq('auction_id', auct.id)
        .order('bid_amount', { ascending: false });

      let auctionResolved = false;

      if (allBids && allBids.length > 0) {
        for (const bid of allBids) {
            // Check Total Capacity (Winner cannot have more than 10)
            const { count: totalPlayers } = await supabaseAdmin.from('user_rosters').select('id', { count: 'exact', head: true }).eq('league_id', auct.league_id).eq('profile_id', bid.profile_id);
            if (totalPlayers !== null && totalPlayers >= 10) {
                console.log(`Skipping bidder ${bid.profile_id} - Roster full (10)`);
                continue;
            }

            // Check Role Capacity (Winner cannot have more than 2 of the same role)
            const { data: userRoster } = await (supabaseAdmin.from('user_rosters').select('pro_players(role)').eq('league_id', auct.league_id).eq('profile_id', bid.profile_id) as any);
            const role = auct.pro_players.role.trim().toUpperCase();
            const roleCount = userRoster?.filter((r: any) => r.pro_players.role.trim().toUpperCase() === role).length || 0;
            
            if (roleCount >= 2) {
                console.log(`Skipping bidder ${bid.profile_id} - Role ${role} full (already has 2)`);
                continue;
            }

            // Check final budget liquidity
            const { data: bidderPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', bid.profile_id).single();
            if (!bidderPart || Number(bidderPart.current_budget) < Number(bid.bid_amount)) {
                console.log(`Skipping bidder ${bid.profile_id} - Insufficient final liquid funds`);
                continue; 
            }

            // SUCCESS: Execute Transfer
            // 1. Charge Buyer
            await supabaseAdmin.from('league_participants').update({ current_budget: Number(bidderPart.current_budget) - Number(bid.bid_amount) }).eq('league_id', auct.league_id).eq('profile_id', bid.profile_id);
            // 2. Pay Seller
            const { data: sellerPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).single();
            if (sellerPart) {
                await supabaseAdmin.from('league_participants').update({ current_budget: Number(sellerPart.current_budget) + Number(bid.bid_amount) }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
            }
            // 3. Add to Buyer Roster
            const starterExists = userRoster?.some((r: any) => r.slot_type === 'starter' && r.pro_players.role.trim().toUpperCase() === role);
            const targetSlot = starterExists ? 'substitute' : 'starter';

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

            // Log Transaction & Notify
            await supabaseAdmin.from('market_transactions').insert({ league_id: auct.league_id, profile_id: bid.profile_id, player_id: auct.player_id, type: 'buy', price: bid.bid_amount });
            const { createNotification } = await import("./notifications");
            await createNotification({ profile_id: auct.seller_id, league_id: auct.league_id, title: "💰 AGENTE VENDIDO", message: `Vendido: ${auct.pro_players.nickname} por $${(bid.bid_amount / 1000000).toFixed(1)}M.`, type: "sale" });
            await createNotification({ profile_id: bid.profile_id, league_id: auct.league_id, title: "✅ SUBASTA GANADA", message: `Ganado: ${auct.pro_players.nickname} por $${(bid.bid_amount / 1000000).toFixed(1)}M.`, type: "buy" });

            auctionResolved = true;
            break;
        }
      }

      if (!auctionResolved) {
          // BANK FALLBACK
          const bankPrice = Math.floor(Number(auct.pro_players.market_value || 10000000) * 0.8);
          const { data: sPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).single();
          if (sPart) {
              await supabaseAdmin.from('league_participants').update({ current_budget: Number(sPart.current_budget) + bankPrice }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
          }
          const { createNotification } = await import("./notifications");
          await createNotification({ profile_id: auct.seller_id, league_id: auct.league_id, title: "🏦 VENTA A LA BANCA", message: `Sin pujas válidas por ${auct.pro_players.nickname}. Pago banca: $${(bankPrice / 1000000).toFixed(1)}M.`, type: "sale" });
      }

      await (supabaseAdmin.from('market_auctions') as any).update({ status: 'sold' }).eq('id', auct.id);
      await supabaseAdmin.from('user_bids').delete().eq('auction_id', auct.id);
    }

    revalidatePath("/market");
    revalidatePath("/team");

    return { success: true, count: expiredAuctions.length };
  } catch (error: any) {
    console.error("Error resolving auctions:", error);
    return { success: false, error: error.message };
  }
}

