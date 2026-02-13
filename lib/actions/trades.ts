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
    const { data: offer, error: oError } = await supabase
      .from('trade_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (oError || !offer) throw new Error("Oferta no encontrada.");
    if (offer.status !== 'pending') throw new Error("La oferta ya no está activa.");
    if (offer.receiver_id !== userId) throw new Error("No tienes permiso para aceptar esta oferta.");
    // Expiration check
    if (new Date(offer.expires_at) < new Date()) throw new Error("La oferta ha expirado.");

    const { league_id, sender_id, receiver_id, sender_player_id, receiver_player_id, cash_offer: cashOffer } = offer;

    // 1. Re-validate Ownership
    if (sender_player_id) {
        const { data: sRoster } = await supabase.from('user_rosters').select('id').eq('league_id', league_id).eq('profile_id', sender_id).eq('player_id', sender_player_id).maybeSingle();
        if (!sRoster) throw new Error("El remitente ya no posee el agente ofrecido.");
    }
    if (receiver_player_id) {
        const { data: rRoster } = await supabase.from('user_rosters').select('id').eq('league_id', league_id).eq('profile_id', receiver_id).eq('player_id', receiver_player_id).maybeSingle();
        if (!rRoster) throw new Error("Ya no posees el agente solicitado.");
    }

    // 2. Validate Budgets
    const { data: senderP } = await supabase.from('league_participants').select('current_budget').eq('league_id', league_id).eq('profile_id', sender_id).single();
    if (!senderP) throw new Error("Participante remitente no encontrado.");
    const { data: receiverP } = await supabase.from('league_participants').select('current_budget').eq('league_id', league_id).eq('profile_id', receiver_id).single();
    if (!receiverP) throw new Error("Participante destinatario no encontrado.");

    if (cashOffer > 0) { // Sender pays
        if (senderP.current_budget < cashOffer) throw new Error("El remitente no tiene fondos suficientes.");
    } else if (cashOffer < 0) { // Receiver pays
        if (receiverP.current_budget < Math.abs(cashOffer)) throw new Error("No tienes fondos suficientes.");
    }

    // 3. Validate Roster Limits (Space)
    // Sender: Loses 1? Gains 1?
    // Receiver: Loses 1? Gains 1?
    
    // Check sender roster count
    const { count: sCount } = await supabase.from('user_rosters').select('id', { count: 'exact', head: true }).eq('league_id', league_id).eq('profile_id', sender_id);
    // Check receiver roster count
    const { count: rCount } = await supabase.from('user_rosters').select('id', { count: 'exact', head: true }).eq('league_id', league_id).eq('profile_id', receiver_id);

    let senderNet = 0;
    if (sender_player_id) senderNet--;
    if (receiver_player_id) senderNet++;

    let receiverNet = 0;
    if (receiver_player_id) receiverNet--;
    if (sender_player_id) receiverNet++;

    if ((sCount || 0) + senderNet > 10) throw new Error("El remitente no tendría espacio suficiente en plantilla.");
    if ((rCount || 0) + receiverNet > 10) throw new Error("No tendrías espacio suficiente en plantilla.");

    // 4. EXECUTE TRADE
    
    // Move Money
    if (cashOffer !== 0) {
        await supabase.from('league_participants').update({ current_budget: senderP.current_budget - cashOffer }).eq('league_id', league_id).eq('profile_id', sender_id);
        await supabase.from('league_participants').update({ current_budget: receiverP.current_budget + cashOffer }).eq('league_id', league_id).eq('profile_id', receiver_id);
    }

    // Move Players
    // Sender gives player to Receiver
    if (sender_player_id) {
        await supabase.from('user_rosters')
            .update({ 
                profile_id: receiver_id, 
                slot_type: 'substitute', 
                is_starter: false, // Reset to sub
                acquisition_price: 0 // Trade value is tricky, set to 0 or estimates? leave as is? Let's use 0 for now or keep original? No, ownership change.
            }) 
            .eq('league_id', league_id)
            .eq('player_id', sender_player_id)
            .eq('profile_id', sender_id);
    }

    // Receiver gives player to Sender
    if (receiver_player_id) {
        await supabase.from('user_rosters')
            .update({ 
                profile_id: sender_id, 
                slot_type: 'substitute', 
                is_starter: false,
                acquisition_price: 0 
            }) 
            .eq('league_id', league_id)
            .eq('player_id', receiver_player_id)
            .eq('profile_id', receiver_id);
    }

    // 5. Update Offer Status
    await supabase.from('trade_offers').update({ status: 'accepted' }).eq('id', offerId);

    // 6. Log Transaction
    if (sender_player_id) {
        await supabase.from('market_transactions').insert({ league_id, profile_id: sender_id, player_id: sender_player_id, type: 'trade_out', price: cashOffer });
        await supabase.from('market_transactions').insert({ league_id, profile_id: receiver_id, player_id: sender_player_id, type: 'trade_in', price: -cashOffer });
    }
    if (receiver_player_id) {
        await supabase.from('market_transactions').insert({ league_id, profile_id: receiver_id, player_id: receiver_player_id, type: 'trade_out', price: -cashOffer });
        await supabase.from('market_transactions').insert({ league_id, profile_id: sender_id, player_id: receiver_player_id, type: 'trade_in', price: cashOffer });
    }

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: "Intercambio completado." };

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
