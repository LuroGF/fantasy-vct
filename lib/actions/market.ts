"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Team {
  tag: string;
  name: string;
}

export interface ProPlayer {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  pro_teams?: Team;
}

export interface MarketAuction {
  id: string;
  league_id: string;
  seller_id: string;
  player_id: string;
  starting_price: number;
  current_bid: number;
  highest_bidder_id: string | null;
  expires_at: string;
  status: 'active' | 'sold' | 'expired' | 'canceled';
  pro_players?: ProPlayer;
  is_revealed?: boolean;
}

// Personal Market: 5 Daily Random Players
export async function getPersonalMarket(leagueId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('get_or_generate_personal_market', { 
      p_league_id: leagueId, 
      p_profile_id: profileId 
    });

  if (error || !data) {
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
    const { data: result, error: rpcError } = await supabase.rpc('handle_buy_from_personal_market', {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_player_id: playerId,
        p_personal_market_id: personalMarketId
    });

    if (rpcError) throw new Error("Error en la transmisión de datos al servidor.");
    if (!result?.success) throw new Error(result?.message || "La compra no pudo completarse.");

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");
    
    return { success: true, message: "Agente reclutado con éxito." };
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
    return (data || []).map((a: any) => ({
      ...a,
      is_revealed: revealSet.has(a.id)
    }));
  }

  return data || [];
}

export async function revealAuction(leagueId: string, profileId: string, auctionId: string) {
  const supabase = await createClient();
  try {
    // 1. Get Spy Eye Power-up Type ID
    const { data: spyType } = await supabase
      .from('powerup_types')
      .select('id')
      .eq('code', 'SPY')
      .single();
    
    if (!spyType) throw new Error("Objeto 'Ojo del Espía' no configurado.");

    // 2. Call Atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc('handle_reveal_auction_atomic', {
        p_auction_id: auctionId,
        p_profile_id: profileId,
        p_spy_eye_type_id: spyType.id
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "No se pudo revelar la subasta.");

    revalidatePath("/market");
    return { success: true, message: "Puja revelada con éxito." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAuction(leagueId: string, profileId: string, playerId: string, startingPrice: number) {
  const supabase = await createClient();
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h auction

    const { data: result, error: rpcError } = await supabase.rpc('handle_create_auction_atomic', {
        p_league_id: leagueId,
        p_seller_id: profileId,
        p_player_id: playerId,
        p_starting_price: startingPrice,
        p_expires_at: expiresAt.toISOString()
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "No se pudo crear la subasta.");
    
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
    const { data: result, error: rpcError } = await supabase.rpc('handle_place_bid_atomic', {
        p_auction_id: auctionId,
        p_profile_id: profileId,
        p_bid_amount: bidAmount
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "La puja no pudo procesarse.");

    revalidatePath("/market");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function withdrawBid(auctionId: string, profileId: string) {
  const supabase = await createClient();
  try {
    const { data: result, error: rpcError } = await supabase.rpc('handle_withdraw_bid_atomic', {
        p_auction_id: auctionId,
        p_profile_id: profileId
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "No se pudo retirar la puja.");

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

    const { data: result, error: rpcError } = await supabase.rpc('handle_sell_player_atomic', {
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
    // Execute atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc('handle_pay_clause', {
        p_league_id: leagueId,
        p_buyer_id: buyerProfileId,
        p_seller_id: targetProfileId,
        p_player_id: playerId
    });

    if (rpcError) throw new Error("Error en la transmisión de datos al servidor.");
    if (!result?.success) throw new Error(result?.message || "La compra por cláusula no pudo completarse.");

    // Fetch player name for the notification/toast message
    const { data: player } = await supabase.from('pro_players').select('nickname').eq('id', playerId).single();

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");
    
    return { 
      success: true, 
      message: `Has reclutado a ${player?.nickname || 'un nuevo agente'}. (${(result.price / 1000000).toFixed(1)}M VP)` 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function buyPlayer(leagueId: string, profileId: string, playerId: string, customPrice?: number) {
  const supabase = await createClient();
  try {
    // 1. Get player name for the success message (optional, but nice)
    const { data: playerData } = await supabase.from('pro_players').select('market_value, nickname').eq('id', playerId).single();
    if (!playerData) throw new Error("Agente no detectado.");
    
    const price = customPrice || playerData.market_value;

    // 2. Transact via RPC for atomicity
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
        pro_players(nickname, market_value)
      `)
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString());

    if (error) throw error;
    if (!expiredAuctions || expiredAuctions.length === 0) return { success: true, count: 0 };

    const { createNotification } = await import("./notifications");

    for (const auct of expiredAuctions) {
      // Get all bids for this auction ordered by amount DESC
      const { data: bids } = await supabaseAdmin
        .from('user_bids')
        .select('*')
        .eq('auction_id', auct.id)
        .order('bid_amount', { ascending: false });

      let resolved = false;

      if (bids && bids.length > 0) {
        // Cascading attempt: try each bid until one succeeds atomically
        for (const bid of bids) {
          const { data: result } = await supabaseAdmin.rpc('handle_resolve_auction_winner', {
            p_auction_id: auct.id,
            p_winner_id: bid.profile_id,
            p_bid_amount: bid.bid_amount
          });

          if (result?.success) {
            await createNotification({ 
              profile_id: auct.seller_id, 
              league_id: auct.league_id, 
              title: "📋 AGENTE TRANSFERIDO", 
              message: `Transferido: ${auct.pro_players.nickname} por ${(bid.bid_amount / 1000000).toFixed(1)}M VP.`, 
              type: "sale" 
            });
            await createNotification({ 
              profile_id: bid.profile_id, 
              league_id: auct.league_id, 
              title: "✅ ASIGNACIÓN EXITOSA", 
              message: `Agente asignado: ${auct.pro_players.nickname} por ${(bid.bid_amount / 1000000).toFixed(1)}M VP.`, 
              type: "buy" 
            });
            resolved = true;
            break;
          }
        }
      }

      if (!resolved) {
          // BANK FALLBACK: If no bids or all bids failed (full squad, no budget), sell to bank at 80%
          const bankPrice = Math.floor(Number(auct.pro_players.market_value || 10000000) * 0.8);
          
          const { data: sellerPart } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).single();
          if (sellerPart) {
              await supabaseAdmin.from('league_participants').update({ current_budget: Number(sellerPart.current_budget) + bankPrice }).eq('league_id', auct.league_id).eq('profile_id', auct.seller_id);
          }
          
          await supabaseAdmin.from('user_rosters').delete().eq('league_id', auct.league_id).eq('profile_id', auct.seller_id).eq('player_id', auct.player_id);
          await (supabaseAdmin.from('market_auctions') as any).update({ status: 'expired' }).eq('id', auct.id);

          await createNotification({ 
            profile_id: auct.seller_id, 
            league_id: auct.league_id, 
            title: "🔄 RETORNO A BASE", 
            message: `Sin asignaciones válidas por ${auct.pro_players.nickname}. Retorno compensado: ${(bankPrice / 1000000).toFixed(1)}M VP.`, 
            type: "sale" 
          });
      }

      // Cleanup bids
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
