"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTradeOffer(
  leagueId: string, 
  senderId: string, 
  receiverId: string, 
  senderPlayerId: string | null, 
  receiverPlayerId: string | null, 
  cashOffer: number // Positive: Sender pays. Negative: Receiver pays.
) {
  const supabase = await createClient();
  try {
    // 1. Validate Ownership
    if (senderPlayerId) {
      const { data: senderRoster } = await supabase
        .from('user_rosters')
        .select('id')
        .eq('league_id', leagueId)
        .eq('profile_id', senderId)
        .eq('player_id', senderPlayerId)
        .single();
      if (!senderRoster) throw new Error("No posees el agente que ofreces.");
    }

    if (receiverPlayerId) {
      const { data: receiverRoster } = await supabase
        .from('user_rosters')
        .select('id')
        .eq('league_id', leagueId)
        .eq('profile_id', receiverId)
        .eq('player_id', receiverPlayerId)
        .single();
      if (!receiverRoster) throw new Error("El destinatario no posee el agente solicitado.");
    }

    if (!senderPlayerId && !receiverPlayerId) {
      throw new Error("El intercambio debe involucrar al menos un agente.");
    }

    // 2. Validate Budget (if applicable)
    if (cashOffer > 0) {
      const { data: sender } = await supabase
        .from('league_participants')
        .select('current_budget')
        .eq('league_id', leagueId)
        .eq('profile_id', senderId)
        .single();
        
      // Also check committed funds
      const { data: committedBids } = await supabase
        .from('user_bids')
        .select('bid_amount, market_auctions!inner(status)')
        .eq('profile_id', senderId)
        .eq('market_auctions.status', 'active');
      const committed = committedBids?.reduce((sum, b) => sum + Number(b.bid_amount), 0) || 0;
      
      if ((sender?.current_budget - committed) < cashOffer) {
        throw new Error("Fondos insuficientes para realizar esta oferta.");
      }
    } else if (cashOffer < 0) {
      // FIX Bug #4: Receiver must pay, check their committed funds too
      const { data: receiver } = await supabase
        .from('league_participants')
        .select('current_budget')
        .eq('league_id', leagueId)
        .eq('profile_id', receiverId)
        .single();
      
      const { data: receiverCommittedBids } = await supabase
        .from('user_bids')
        .select('bid_amount, market_auctions!inner(status)')
        .eq('profile_id', receiverId)
        .eq('market_auctions.status', 'active');
      const receiverCommitted = receiverCommittedBids?.reduce((sum, b) => sum + Number(b.bid_amount), 0) || 0;
      
      if ((receiver?.current_budget - receiverCommitted) < Math.abs(cashOffer)) {
        throw new Error("El destinatario no tiene fondos suficientes para esta oferta.");
      }
    }
    
    // 3. Create Offer
    const { error } = await supabase
      .from('trade_offers')
      .insert({
        league_id: leagueId,
        sender_id: senderId,
        receiver_id: receiverId,
        sender_player_id: senderPlayerId,
        receiver_player_id: receiverPlayerId,
        cash_offer: cashOffer,
        status: 'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
      });

    if (error) throw error;

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: "Oferta de intercambio enviada." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptTradeOffer(offerId: string, userId: string) {
  const supabase = await createClient();
  try {
    // FIX Bug #8: Use atomic RPC function for trade acceptance
    const { data, error } = await supabase.rpc('accept_trade_offer_atomic', {
      p_offer_id: offerId,
      p_receiver_id: userId
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; message?: string };
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al aceptar trade');
    }

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: result.message || 'Intercambio completado.' };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectTradeOffer(offerId: string, userId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('trade_offers')
            .update({ status: 'rejected' })
            .eq('id', offerId)
            // .eq('receiver_id', userId); // Allow reject only if receiver
            // Wait, maybe confirm user is involved?
            .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`); // Sender can cancel too? No, separate cancel.
        
        if (error) throw error;
        revalidatePath("/market");
        return { success: true, message: "Oferta rechazada." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function cancelTradeOffer(offerId: string, userId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('trade_offers')
            .update({ status: 'canceled' })
            .eq('id', offerId)
            .eq('sender_id', userId);
        
        if (error) throw error;
        revalidatePath("/market");
        return { success: true, message: "Oferta cancelada." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getTrades(leagueId: string, userId: string) {
    const supabase = await createClient();
    const { data: offers, error } = await supabase
        .from('trade_offers')
        .select(`
            *,
            sender_player:pro_players!trade_offers_sender_player_id_fkey(id, nickname, role, pro_teams(tag)),
            receiver_player:pro_players!trade_offers_receiver_player_id_fkey(id, nickname, role, pro_teams(tag)),
            sender:profiles!trade_offers_sender_id_fkey(username),
            receiver:profiles!trade_offers_receiver_id_fkey(username)
        `)
        .eq('league_id', leagueId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }
    return offers;
}
