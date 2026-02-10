"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Personal Market: 4 Daily Random Players
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
    // Check if player is owned by user
    const { data: roster, error: rError } = await supabase
      .from('user_rosters')
      .select('id')
      .eq('league_id', leagueId)
      .eq('profile_id', profileId)
      .eq('player_id', playerId)
      .single();
    
    if (rError || !roster) throw new Error("No posees a este jugador.");

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
        .select('market_value')
        .eq('id', playerId)
        .single();
    
    if (plError || !playerData) throw new Error("Agente no encontrado.");
    
    const price = customPrice || playerData.market_value;

    // 2. Journey block check
    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('id, is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("El mercado operacional está bloqueado (Jornada en curso).");
    }

    // 3. User participant check
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("No se pudo verificar el budget operacional.");
    if (participant.current_budget < price) throw new Error("Presupuesto insuficiente.");

    // 4. Ownership check (Now allows multiple owners, just check if I already have him)
    const { data: myOwner } = await supabase
      .from("user_rosters")
      .select("id")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("player_id", playerId)
      .single();

    if (myOwner) throw new Error("Ya tienes a este agente en tu escuadra.");


    // 5. Total Capacity Check (Max 15 players total)
    const { count: totalCount } = await supabase
      .from("user_rosters")
      .select("id", { count: 'exact', head: true })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);
    
    if (totalCount !== null && totalCount >= 15) {
        throw new Error("Capacidad máxima de escuadra alcanzada (15 agentes).");
    }

    // 6. Transaction record
    await supabase.from("market_transactions").insert({
        league_id: leagueId,
        profile_id: profileId,
        player_id: playerId,
        type: 'buy',
        price: price
    });

    // 7. Auto-assign slot
    const { data: slots } = await supabase
      .from("user_rosters")
      .select("slot_type")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);
    
    const startersCount = slots?.filter(s => s.slot_type === 'starter').length || 0;
    const subsCount = slots?.filter(s => s.slot_type === 'substitute').length || 0;

    let targetSlot: 'starter' | 'substitute' | 'bench' = 'bench';
    if (startersCount < 5) targetSlot = 'starter';
    else if (subsCount < 4) targetSlot = 'substitute';

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

    const { data: activeGw } = await supabase
      .from('gameweeks')
      .select('is_locked')
      .eq('is_active', true)
      .single();

    if (activeGw?.is_locked) {
      throw new Error("Protocolo de mercado bloqueado durante operación.");
    }

    const { data: participant } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

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

    
    const ownerId = rosterEntry.profile_id;
    const clausePrice = rosterEntry.release_clause || 0;

    const { data: activeGw } = await supabase.from('gameweeks').select('id, is_locked').eq('is_active', true).single();
    if (activeGw?.is_locked) throw new Error("Mercado bloqueado por operación en curso.");

    const { data: buyer } = await supabase
        .from("league_participants")
        .select("current_budget")
        .eq("league_id", leagueId)
        .eq("profile_id", buyerProfileId)
        .single();
    
    if (!buyer || Number(buyer.current_budget) < Number(clausePrice)) throw new Error("Presupuesto insuficiente para rescisión.");

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
    
    const { data: slots } = await supabase.from("user_rosters").select("slot_type").eq("league_id", leagueId).eq("profile_id", buyerProfileId);
    const startersCount = slots?.filter(s => s.slot_type === 'starter').length || 0;
    const subsCount = slots?.filter(s => s.slot_type === 'substitute').length || 0;
    let targetSlot: 'starter' | 'substitute' | 'bench' = 'bench';
    if (startersCount < 5) targetSlot = 'starter';
    else if (subsCount < 4) targetSlot = 'substitute';

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

