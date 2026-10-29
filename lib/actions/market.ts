"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { createNotification } from "@/lib/notifications/create";
import { getMarketEligiblePlayerIds } from "@/lib/player-eligibility";
import { isMoneyAmount, isUuid } from "@/lib/security/validation";

export type MarketPlayer = {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  photo_url: string | null;
  team_id?: string | null;
  is_legend?: boolean;
  pro_teams?: {
    id?: string;
    tag: string;
    name: string;
    logo_url?: string | null;
  } | null;
};

export type MarketAuction = {
  id: string;
  cycle_id: string;
  league_id: string;
  player_id: string;
  market_value_snapshot: number;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at?: string;
  player?: MarketPlayer | null;
  my_bid?: {
    id: string;
    amount: number;
    submitted_at: string;
  } | null;
};

async function requireUser(expectedProfileId?: string) {
  const session = await getSession();
  if (!session) throw new Error("Sesión no válida");
  if (expectedProfileId && session.user.id !== expectedProfileId) {
    throw new Error("Acceso no autorizado");
  }
  return session.user;
}

async function getProfileName(supabase: any, profileId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();
  return data?.username || "Otro entrenador";
}

async function getPlayerName(supabase: any, playerId: string) {
  const { data } = await supabase
    .from("pro_players")
    .select("nickname")
    .eq("id", playerId)
    .maybeSingle();
  return data?.nickname || "tu jugador";
}

function marketActionError(error: unknown, fallback: string) {
  console.error("Market action failed:", error);
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (message.includes("insufficient") || message.includes("not enough budget")) {
    return "No tienes saldo suficiente para completar la operación.";
  }
  if (message.includes("auction") && (message.includes("not open") || message.includes("not found"))) {
    return "La puja ya no está disponible.";
  }
  if (message.includes("protected") || message.includes("protection")) {
    return "Este jugador todavía está protegido frente a cláusulas.";
  }
  if (message.includes("roster") && (message.includes("full") || message.includes("limit"))) {
    return "Tu plantilla ha alcanzado el límite permitido.";
  }
  if (message.includes("offer") && (message.includes("expired") || message.includes("not found"))) {
    return "La oferta ya no está disponible.";
  }

  return fallback;
}

export async function getMarketDashboard(leagueId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();

  const [
    participantRes,
    auctionsRes,
    bidsRes,
    rostersRes,
    profilesRes,
    listingsRes,
    managerOffersRes,
    leagueOffersRes,
  ] = await Promise.all([
    supabase
      .from("league_participants")
      .select("league_id, profile_id, current_budget, leagues(id, name, invite_code)")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .maybeSingle(),

    supabase
      .from("market_auctions")
      .select("*")
      .eq("league_id", leagueId)
      .eq("status", "open")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true }),

    supabase
      .from("user_bids")
      .select("id, auction_id, league_id, profile_id, amount, submitted_at")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId),

    supabase
      .from("user_rosters")
      .select("id, league_id, profile_id, player_id, slot_type, is_starter, is_active, release_clause, clause_protected_until, acquired_at")
      .eq("league_id", leagueId)
      .eq("is_active", true),

    supabase
      .from("profiles")
      .select("id, username"),

    supabase
      .from("player_listings")
      .select("*")
      .eq("league_id", leagueId)
      .eq("status", "active")
      .order("listed_at", { ascending: false }),

    supabase
      .from("manager_offers")
      .select("*")
      .eq("league_id", leagueId)
      .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
      .order("created_at", { ascending: false }),

    supabase
      .from("league_offers")
      .select("*")
      .eq("league_id", leagueId)
      .eq("owner_profile_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = [
    participantRes.error,
    auctionsRes.error,
    bidsRes.error,
    rostersRes.error,
    profilesRes.error,
    listingsRes.error,
    managerOffersRes.error,
    leagueOffersRes.error,
  ].find(Boolean);

  if (firstError) {
    console.error("Error loading market dashboard:", firstError);
    throw new Error("No se ha podido cargar el mercado.");
  }

  const auctions = auctionsRes.data || [];
  const rosters = rostersRes.data || [];
  const listings = listingsRes.data || [];
  const managerOffers = managerOffersRes.data || [];
  const leagueOffers = leagueOffersRes.data || [];

  const playerIds = Array.from(
    new Set([
      ...auctions.map((x: any) => x.player_id),
      ...rosters.map((x: any) => x.player_id),
      ...listings.map((x: any) => x.player_id),
      ...managerOffers.map((x: any) => x.player_id),
      ...leagueOffers.map((x: any) => x.player_id),
    ].filter(Boolean)),
  );

  let players: any[] = [];
  if (playerIds.length > 0) {
    const { data, error } = await supabase
      .from("pro_players")
      .select("id, nickname, role, market_value, photo_url, team_id, is_legend, pro_teams(id, tag, name, logo_url)")
      .in("id", playerIds);

    if (error) {
      console.error("Error loading market players:", error);
      throw new Error("No se ha podido cargar el mercado.");
    }
    players = data || [];
  }

  const eligiblePlayerIds = await getMarketEligiblePlayerIds(
    supabase,
    players.map((player: any) => player.id),
  );
  const playerMap = new Map(players.map((p: any) => [p.id, p]));
  const bidMap = new Map((bidsRes.data || []).map((b: any) => [b.auction_id, b]));
  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const listingMap = new Map(listings.map((l: any) => [l.id, l]));

  const hydratedAuctions = auctions
    .filter((auction: any) => eligiblePlayerIds.has(auction.player_id))
    .map((a: any) => ({
      ...a,
      player: playerMap.get(a.player_id) || null,
      my_bid: bidMap.get(a.id) || null,
    }));

  const rivals = Array.from(
    new Set(rosters.filter((r: any) => r.profile_id !== profileId).map((r: any) => r.profile_id)),
  ).map((rivalId: any) => ({
    profile_id: rivalId,
    username: profileMap.get(rivalId)?.username || "Manager",
    roster: rosters
      .filter(
        (r: any) =>
          r.profile_id === rivalId && eligiblePlayerIds.has(r.player_id),
      )
      .map((r: any) => ({
        ...r,
        player: playerMap.get(r.player_id) || null,
        listing: listings.find((l: any) => l.roster_id === r.id && l.status === "active") || null,
      })),
  }));

  const myListings = listings
    .filter(
      (l: any) =>
        l.owner_profile_id === profileId && eligiblePlayerIds.has(l.player_id),
    )
    .map((l: any) => ({
      ...l,
      player: playerMap.get(l.player_id) || null,
      manager_offers: managerOffers
        .filter((o: any) => o.listing_id === l.id)
        .map((o: any) => ({
          ...o,
          from_username: profileMap.get(o.from_profile_id)?.username || "Manager",
        })),
      league_offer:
        leagueOffers.find((o: any) => o.listing_id === l.id && o.status === "pending") || null,
    }));

  const hydratedManagerOffers = managerOffers
    .filter((offer: any) => eligiblePlayerIds.has(offer.player_id))
    .map((o: any) => ({
      ...o,
      player: playerMap.get(o.player_id) || null,
      listing: listingMap.get(o.listing_id) || null,
      from_username: profileMap.get(o.from_profile_id)?.username || "Manager",
      to_username: profileMap.get(o.to_profile_id)?.username || "Manager",
    }));

  const eligibleAuctionIds = new Set(
    hydratedAuctions.map((auction: any) => auction.id),
  );
  const eligibleBids = (bidsRes.data || []).filter((bid: any) =>
    eligibleAuctionIds.has(bid.auction_id),
  );

  const bidExposure = eligibleBids.reduce(
    (sum: number, bid: any) => sum + Number(bid.amount || 0),
    0,
  );

  return {
    participant: participantRes.data,
    auctions: hydratedAuctions,
    rivals,
    myListings,
    managerOffers: hydratedManagerOffers,
    leagueOffers: leagueOffers
      .filter((offer: any) => eligiblePlayerIds.has(offer.player_id))
      .map((o: any) => ({
        ...o,
        player: playerMap.get(o.player_id) || null,
      })),
    stats: {
      activeBids: eligibleBids.length,
      bidExposure,
    },
  };
}

export async function placeBid(auctionId: string, profileId: string, bidAmount: number) {
  await requireUser(profileId);
  if (!isUuid(auctionId) || !isUuid(profileId) || !isMoneyAmount(bidAmount) || bidAmount <= 0) {
    return { success: false, error: "La puja no es válida." };
  }
  const supabase = await createClient();

  const { data: auction } = await supabase
    .from("market_auctions")
    .select("player_id")
    .eq("id", auctionId)
    .eq("status", "open")
    .maybeSingle();
  const eligiblePlayerIds = await getMarketEligiblePlayerIds(
    supabase,
    auction?.player_id ? [auction.player_id] : [],
  );
  if (!auction || !eligiblePlayerIds.has(auction.player_id)) {
    return { success: false, error: "Este jugador no está disponible en el mercado." };
  }

  const { error } = await supabase.rpc("place_market_bid", {
    p_auction_id: auctionId,
    p_amount: bidAmount,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido realizar la puja.") };
  revalidatePath("/market");
  return { success: true };
}

export async function withdrawBid(auctionId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(auctionId) || !isUuid(profileId)) {
    return { success: false, error: "La puja no es válida." };
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_market_bid", {
    p_auction_id: auctionId,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido retirar la puja.") };
  revalidatePath("/market");
  return { success: true };
}

export async function listPlayerForSale(
  rosterId: string,
  askingPrice: number,
  profileId: string,
) {
  await requireUser(profileId);
  if (!isUuid(rosterId) || !isUuid(profileId) || !isMoneyAmount(askingPrice) || askingPrice <= 0) {
    return { success: false, error: "El precio de venta no es válido." };
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc("list_player_for_sale", {
    p_roster_id: rosterId,
    p_asking_price: askingPrice,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido poner el jugador a la venta.") };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function withdrawPlayerListing(listingId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(listingId) || !isUuid(profileId)) {
    return { success: false, error: "La venta no es válida." };
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc("withdraw_player_listing", {
    p_listing_id: listingId,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido retirar la venta.") };
  revalidatePath("/market");
  return { success: true };
}


export async function updatePlayerListingPrice(
  listingId: string,
  askingPrice: number,
  profileId: string,
) {
  await requireUser(profileId);
  if (!isUuid(listingId) || !isUuid(profileId) || !isMoneyAmount(askingPrice) || askingPrice <= 0) {
    return { success: false, error: "El precio de venta no es válido." };
  }
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_player_listing_price", {
    p_listing_id: listingId,
    p_asking_price: askingPrice,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido actualizar el precio.") };

  revalidatePath("/market");
  revalidatePath("/team");

  return { success: true };
}

export async function makeManagerOffer(
  listingId: string,
  amount: number,
  profileId: string,
) {
  await requireUser(profileId);
  if (!isUuid(listingId) || !isUuid(profileId) || !isMoneyAmount(amount) || amount <= 0) {
    return { success: false, error: "La oferta no es válida." };
  }
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("player_listings")
    .select("league_id, player_id, owner_profile_id")
    .eq("id", listingId)
    .maybeSingle();

  const { error } = await supabase.rpc("make_manager_offer", {
    p_listing_id: listingId,
    p_amount: amount,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido enviar la oferta.") };

  if (listing?.owner_profile_id && listing.owner_profile_id !== profileId) {
    const [managerName, playerName] = await Promise.all([
      getProfileName(supabase, profileId),
      getPlayerName(supabase, listing.player_id),
    ]);
    await createNotification({
      profile_id: listing.owner_profile_id,
      league_id: listing.league_id,
      title: `Nueva oferta por ${playerName}`,
      message: `${managerName} ha ofrecido ${amount.toLocaleString("es-ES")} € por ${playerName}.`,
      type: "manager_offer_received",
      category: "market",
      action_url: `/market?league=${listing.league_id}`,
      dedupe_key: `manager-offer:${listingId}:${profileId}`,
    });
  }
  revalidatePath("/market");
  return { success: true };
}


export async function updateManagerOffer(
  offerId: string,
  amount: number,
  profileId: string,
) {
  await requireUser(profileId);
  if (!isUuid(offerId) || !isUuid(profileId) || !isMoneyAmount(amount) || amount <= 0) {
    return { success: false, error: "La oferta no es válida." };
  }
  const supabase = await createClient();

  const { data: offer } = await supabase
    .from("manager_offers")
    .select("league_id, player_id, to_profile_id, from_profile_id")
    .eq("id", offerId)
    .eq("from_profile_id", profileId)
    .maybeSingle();

  const { error } = await supabase.rpc("update_manager_offer", {
    p_offer_id: offerId,
    p_amount: amount,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido actualizar la oferta.") };

  if (offer?.to_profile_id) {
    const [managerName, playerName] = await Promise.all([
      getProfileName(supabase, profileId),
      getPlayerName(supabase, offer.player_id),
    ]);
    await createNotification({
      profile_id: offer.to_profile_id,
      league_id: offer.league_id,
      title: `Oferta actualizada por ${playerName}`,
      message: `${managerName} ha actualizado su oferta a ${amount.toLocaleString("es-ES")} €.`,
      type: "manager_offer_updated",
      category: "market",
      action_url: `/market?league=${offer.league_id}`,
      dedupe_key: `manager-offer-update:${offerId}:${amount}`,
    });
  }

  revalidatePath("/market");
  return { success: true };
}

export async function acceptManagerOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(offerId) || !isUuid(profileId)) return { success: false, error: "La oferta no es válida." };
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("manager_offers")
    .select("league_id, player_id, from_profile_id, to_profile_id")
    .eq("id", offerId)
    .eq("to_profile_id", profileId)
    .maybeSingle();
  const { error } = await supabase.rpc("accept_manager_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: marketActionError(error, "No se ha podido aceptar la oferta.") };
  if (offer?.from_profile_id) {
    const playerName = await getPlayerName(supabase, offer.player_id);
    await createNotification({
      profile_id: offer.from_profile_id,
      league_id: offer.league_id,
      title: `Has fichado a ${playerName}`,
      message: `Tu oferta por ${playerName} ha sido aceptada.`,
      type: "manager_offer_accepted",
      category: "market",
      action_url: `/team?league=${offer.league_id}`,
      dedupe_key: `manager-offer-accepted:${offerId}`,
    });
  }
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function rejectManagerOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(offerId) || !isUuid(profileId)) return { success: false, error: "La oferta no es válida." };
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("manager_offers")
    .select("league_id, player_id, from_profile_id, to_profile_id")
    .eq("id", offerId)
    .eq("to_profile_id", profileId)
    .maybeSingle();
  const { error } = await supabase.rpc("reject_manager_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: marketActionError(error, "No se ha podido rechazar la oferta.") };
  if (offer?.from_profile_id) {
    const playerName = await getPlayerName(supabase, offer.player_id);
    await createNotification({
      profile_id: offer.from_profile_id,
      league_id: offer.league_id,
      title: `Oferta rechazada por ${playerName}`,
      message: `El propietario de ${playerName} ha rechazado tu oferta.`,
      type: "manager_offer_rejected",
      category: "market",
      action_url: `/market?league=${offer.league_id}`,
      dedupe_key: `manager-offer-rejected:${offerId}`,
    });
  }
  revalidatePath("/market");
  return { success: true };
}

export async function acceptLeagueOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(offerId) || !isUuid(profileId)) return { success: false, error: "La oferta no es válida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_league_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: marketActionError(error, "No se ha podido aceptar la oferta de la liga.") };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function rejectLeagueOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(offerId) || !isUuid(profileId)) return { success: false, error: "La oferta no es válida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_league_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: marketActionError(error, "No se ha podido rechazar la oferta de la liga.") };
  revalidatePath("/market");
  return { success: true };
}

export async function payReleaseClause(rosterId: string, profileId: string) {
  await requireUser(profileId);
  if (!isUuid(rosterId) || !isUuid(profileId)) return { success: false, error: "El jugador no es válido." };
  const supabase = await createClient();

  const { data: roster } = await supabase
    .from("user_rosters")
    .select("league_id, profile_id, player_id")
    .eq("id", rosterId)
    .maybeSingle();

  const { error } = await supabase.rpc("pay_release_clause", {
    p_roster_id: rosterId,
  });

  if (error) return { success: false, error: marketActionError(error, "No se ha podido pagar la cláusula.") };
  if (roster?.profile_id && roster.profile_id !== profileId) {
    const [buyerName, playerName] = await Promise.all([
      getProfileName(supabase, profileId),
      getPlayerName(supabase, roster.player_id),
    ]);
    await createNotification({
      profile_id: roster.profile_id,
      league_id: roster.league_id,
      title: `Han fichado a ${playerName}`,
      message: `${buyerName} ha pagado la cláusula de ${playerName}.`,
      type: "release_clause_paid",
      category: "market",
      action_url: `/market?league=${roster.league_id}`,
      dedupe_key: `release-clause:${rosterId}:${profileId}`,
    });
  }
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}
