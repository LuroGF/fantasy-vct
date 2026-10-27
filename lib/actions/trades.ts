"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePlayerActionAvailability } from "./player-action-guards";
import { getSession } from "./auth";
import { createNotification } from "@/lib/notifications/create";
import { isMoneyAmount, isUuid } from "@/lib/security/validation";

export async function createTradeOffer(
  leagueId: string, 
  senderId: string, 
  receiverId: string, 
  senderPlayerId: string | null, 
  receiverPlayerId: string | null, 
  cashOffer: number // Positive: Sender pays. Negative: Receiver pays.
) {
  const session = await getSession();
  if (!session || session.user.id !== senderId) {
    throw new Error("No autorizado");
  }

  if (
    !isUuid(leagueId) ||
    !isUuid(senderId) ||
    !isUuid(receiverId) ||
    (senderPlayerId !== null && !isUuid(senderPlayerId)) ||
    (receiverPlayerId !== null && !isUuid(receiverPlayerId)) ||
    !isMoneyAmount(cashOffer, { allowNegative: true })
  ) {
    return { success: false, error: "Los datos de la oferta no son válidos." };
  }

  const supabase = await createClient();
  try {
    if (!senderPlayerId && !receiverPlayerId) {
      throw new Error("El intercambio debe involucrar al menos un jugador.");
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

    const [{ data: sender }, { data: players }] = await Promise.all([
      supabase.from("profiles").select("username").eq("id", senderId).maybeSingle(),
      supabase
        .from("pro_players")
        .select("id, nickname")
        .in("id", [senderPlayerId, receiverPlayerId].filter(Boolean) as string[]),
    ]);
    const playerNames = (players || []).map((player: any) => player.nickname).join(" / ");
    await createNotification({
      profile_id: receiverId,
      league_id: leagueId,
      title: "Nueva propuesta de intercambio",
      message: `${sender?.username || "Otro entrenador"} te ha enviado una propuesta${playerNames ? ` por ${playerNames}` : ""}.`,
      type: "trade_offer_received",
      category: "market",
      action_url: `/market?league=${leagueId}`,
    });

    revalidatePath("/market");
    revalidatePath("/team");
    return { success: true, message: "Oferta de intercambio enviada." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptTradeOffer(offerId: string, userId: string) {
  const session = await getSession();
  if (!session || session.user.id !== userId) {
    throw new Error("No autorizado");
  }
  const { supabaseAdmin } = await import("@/utils/supabase/admin");
  try {
    const { data: offer } = await supabaseAdmin.from('trade_offers').select('league_id, receiver_id, sender_id, receiver_player_id, sender_player_id').eq('id', offerId).single();
    if (!offer) throw new Error("Oferta no encontrada");

    // Verificar si el jugador del emisor todavía le pertenece
    if (offer.sender_player_id) {
        const { count: isStillOwnedBySender } = await supabaseAdmin.from('user_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', offer.league_id)
            .eq('profile_id', offer.sender_id)
            .eq('player_id', offer.sender_player_id);
            
        if (!isStillOwnedBySender || isStillOwnedBySender === 0) {
            await supabaseAdmin.from('trade_offers').update({ status: 'canceled' }).eq('id', offerId);
            throw new Error("El intercambio ha sido cancelado porque el emisor ya no posee al jugador ofrecido.");
        }
    }

    // Verificar si el jugador del receptor todavía le pertenece
    if (offer.receiver_player_id) {
        const { count: isStillOwnedByReceiver } = await supabaseAdmin.from('user_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', offer.league_id)
            .eq('profile_id', offer.receiver_id)
            .eq('player_id', offer.receiver_player_id);
            
        if (!isStillOwnedByReceiver || isStillOwnedByReceiver === 0) {
            await supabaseAdmin.from('trade_offers').update({ status: 'canceled' }).eq('id', offerId);
            throw new Error("El intercambio ha sido cancelado porque ya no posees al jugador solicitado.");
        }
    }

    const { validateRosterRoleLimits } = await import("./player-action-guards");

    // Validar si el receptor supera el límite al recibir el jugador del emisor
    if (offer.sender_player_id) {
        const { data: pReceptorRecibe } = await supabaseAdmin.from('pro_players').select('role').eq('id', offer.sender_player_id).single();
        if (pReceptorRecibe) {
            await validateRosterRoleLimits(supabaseAdmin, offer.league_id, offer.receiver_id, pReceptorRecibe.role, offer.receiver_player_id || undefined);
        }
    }

    // Validar si el emisor supera el límite al recibir el jugador del receptor
    if (offer.receiver_player_id) {
        const { data: pEmisorRecibe } = await supabaseAdmin.from('pro_players').select('role').eq('id', offer.receiver_player_id).single();
        if (pEmisorRecibe) {
            await validateRosterRoleLimits(supabaseAdmin, offer.league_id, offer.sender_id, pEmisorRecibe.role, offer.sender_player_id || undefined);
        }
    }

    // FIX Bug #8: Use atomic RPC function for trade acceptance
    const { data, error } = await supabaseAdmin.rpc('accept_trade_offer_atomic', {

      p_offer_id: offerId,
      p_receiver_id: userId
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; message?: string };
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al aceptar trade');
    }

    await createNotification({
      profile_id: offer.sender_id,
      league_id: offer.league_id,
      title: "Intercambio aceptado",
      message: "Tu propuesta de intercambio ha sido aceptada.",
      type: "trade_offer_accepted",
      category: "market",
      action_url: `/team?league=${offer.league_id}`,
      dedupe_key: `trade-accepted:${offerId}`,
    });

    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/");
    return { success: true, message: result.message || 'Intercambio completado.' };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectTradeOffer(offerId: string, userId: string) {
    const session = await getSession();
    if (!session || session.user.id !== userId) {
        throw new Error("No autorizado");
    }
    const { supabaseAdmin } = await import("@/utils/supabase/admin");
    try {
        const { data: offer } = await supabaseAdmin
            .from('trade_offers')
            .select('league_id, sender_id, receiver_id')
            .eq('id', offerId)
            .maybeSingle();
        const { error, data } = await supabaseAdmin
            .from('trade_offers')
            .update({ status: 'rejected' })
            .eq('id', offerId)
            .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
            .select();
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("No se pudo rechazar la oferta. Verifique sus permisos.");

        if (offer?.sender_id && offer.sender_id !== userId) {
            await createNotification({
                profile_id: offer.sender_id,
                league_id: offer.league_id,
                title: "Intercambio rechazado",
                message: "Tu propuesta de intercambio ha sido rechazada.",
                type: "trade_offer_rejected",
                category: "market",
                action_url: `/market?league=${offer.league_id}`,
                dedupe_key: `trade-rejected:${offerId}`,
            });
        }

        revalidatePath("/market");
        return { success: true, message: "Oferta rechazada." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function cancelTradeOffer(offerId: string, userId: string) {
    const session = await getSession();
    if (!session || session.user.id !== userId) {
        throw new Error("No autorizado");
    }
    const { supabaseAdmin } = await import("@/utils/supabase/admin");
    try {
        const { error, data } = await supabaseAdmin
            .from('trade_offers')
            .update({ status: 'canceled' })
            .eq('id', offerId)
            .eq('sender_id', userId)
            .select();
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("No se pudo cancelar la oferta. Verifique sus permisos.");

        revalidatePath("/market");
        return { success: true, message: "Oferta cancelada." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getTrades(leagueId: string, userId: string) {
    const session = await getSession();
    if (!session || session.user.id !== userId || !isUuid(leagueId) || !isUuid(userId)) {
        return [];
    }
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
        console.error("[TRADES] Could not load offers:", error.message);
        return [];
    }
    return offers || [];
}
