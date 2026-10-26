import type { SupabaseClient } from "@supabase/supabase-js";

interface ValidatePlayerActionParams {
  supabase: SupabaseClient;
  leagueId: string;
  playerId: string;
  actionLabel: string;
  ignorePendingTradeForProfileId?: string;
}

export async function validatePlayerActionAvailability({
  supabase,
  leagueId,
  playerId,
  actionLabel,
  ignorePendingTradeForProfileId,
}: ValidatePlayerActionParams) {
  const now = new Date().toISOString();

  const { data: activeAuction, error: auctionError } = await supabase
    .from("market_auctions")
    .select("id")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .eq("status", "active")
    .gt("expires_at", now)
    .maybeSingle();

  if (auctionError) {
    throw new Error("No se pudo validar el estado de subasta del jugador.");
  }

  if (activeAuction) {
    throw new Error(`No puedes ${actionLabel}: el jugador está en una subasta activa.`);
  }

  // Comprobar si es leyenda (no se pueden poner en subasta, vender ni tradear regularmente)
  const { data: playerInfo } = await supabase.from('pro_players').select('is_legend').eq('id', playerId).single();
  if (playerInfo?.is_legend) {
      throw new Error(`No puedes ${actionLabel}: los jugadores de Leyenda son intransferibles y no pueden participar en el mercado ordinario.`);
  }

  const { data: pendingTrade, error: tradeError } = await supabase
    .from("trade_offers")
    .select("id, sender_id, receiver_id")
    .eq("league_id", leagueId)
    .eq("status", "pending")
    .or(`sender_player_id.eq.${playerId},receiver_player_id.eq.${playerId}`)
    .maybeSingle();

  if (tradeError) {
    throw new Error("No se pudo validar el estado de intercambio del jugador.");
  }

  if (pendingTrade) {
    if (
      ignorePendingTradeForProfileId &&
      (pendingTrade.sender_id === ignorePendingTradeForProfileId ||
        pendingTrade.receiver_id === ignorePendingTradeForProfileId)
    ) {
      return;
    }

    throw new Error(`No puedes ${actionLabel}: el jugador tiene un intercambio pendiente.`);
  }
}

export async function validateRosterRoleLimits(supabase: SupabaseClient, leagueId: string, profileId: string, newPlayerRole: string, ignoredPlayerId?: string) {
  const { data: roster } = await supabase
    .from('user_rosters')
    .select('player_id, pro_players(role)')
    .eq('league_id', leagueId)
    .eq('profile_id', profileId);

  if (!roster) return;

  const validRoster = ignoredPlayerId 
    ? roster.filter(p => p.player_id !== ignoredPlayerId)
    : roster;

  const roleCount = validRoster.filter(p => (p.pro_players as any)?.role === newPlayerRole).length;

  if (roleCount >= 2) {
    throw new Error(`Límite excedido: solo puedes tener un máximo de 2 jugadores con el rol ${newPlayerRole}.`);
  }
}
