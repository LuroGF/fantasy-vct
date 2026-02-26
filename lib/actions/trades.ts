"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePlayerActionAvailability } from "./player-action-guards";

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
    if (!senderPlayerId && !receiverPlayerId) {
      throw new Error("El intercambio debe involucrar al menos un agente.");
    }

    if (senderPlayerId) {
      await validatePlayerActionAvailability({
        supabase,
        leagueId,
        playerId: senderPlayerId,
        actionLabel: "ofrecerlo en intercambio",
        ignorePendingTradeForProfileId: senderId,
      });
    }

    if (receiverPlayerId) {
      await validatePlayerActionAvailability({
        supabase,
        leagueId,
        playerId: receiverPlayerId,
        actionLabel: "solicitarlo en intercambio",
        ignorePendingTradeForProfileId: receiverId,
      });
    }

    const { data: result, error: rpcError } = await supabase.rpc('handle_create_trade_offer', {
        p_league_id: leagueId,
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_sender_player_id: senderPlayerId,
        p_receiver_player_id: receiverPlayerId,
        p_cash_offer: cashOffer
    });

    if (rpcError) throw new Error("Error en la transmisión del intercambio.");
    if (!result?.success) throw new Error(result?.message || "No se pudo crear la oferta.");

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
    revalidatePath("/");
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
    const { supabaseAdmin } = await import("@/utils/supabase/admin");
    const { data: offers, error } = await supabaseAdmin
        .from('trade_offers')
        .select(`
            id, league_id, sender_id, receiver_id, sender_player_id, receiver_player_id, 
            cash_offer, status, created_at, expires_at,
            sender_player:pro_players!sender_player_id(id, nickname, role),
            receiver_player:pro_players!receiver_player_id(id, nickname, role),
            sender:profiles!sender_id(username),
            receiver:profiles!receiver_id(username)
        `)
        .eq('league_id', leagueId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("DEBUG TRADES ERROR:", error);
        return [];
    }
    return offers || [];
}
