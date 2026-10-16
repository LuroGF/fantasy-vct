"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";

export type MarketPlayer = {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  photo_url: string | null;
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
    throw new Error(firstError.message);
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
      .select("id, nickname, role, market_value, photo_url, team_id, pro_teams(id, tag, name, logo_url)")
      .in("id", playerIds);

    if (error) throw new Error(error.message);
    players = data || [];
  }

  const playerMap = new Map(players.map((p: any) => [p.id, p]));
  const bidMap = new Map((bidsRes.data || []).map((b: any) => [b.auction_id, b]));
  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const listingMap = new Map(listings.map((l: any) => [l.id, l]));

  const hydratedAuctions = auctions.map((a: any) => ({
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
      .filter((r: any) => r.profile_id === rivalId)
      .map((r: any) => ({
        ...r,
        player: playerMap.get(r.player_id) || null,
        listing: listings.find((l: any) => l.roster_id === r.id && l.status === "active") || null,
      })),
  }));

  const myListings = listings
    .filter((l: any) => l.owner_profile_id === profileId)
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

  const hydratedManagerOffers = managerOffers.map((o: any) => ({
    ...o,
    player: playerMap.get(o.player_id) || null,
    listing: listingMap.get(o.listing_id) || null,
    from_username: profileMap.get(o.from_profile_id)?.username || "Manager",
    to_username: profileMap.get(o.to_profile_id)?.username || "Manager",
  }));

  const bidExposure = (bidsRes.data || []).reduce(
    (sum: number, bid: any) => sum + Number(bid.amount || 0),
    0,
  );

  return {
    participant: participantRes.data,
    auctions: hydratedAuctions,
    rivals,
    myListings,
    managerOffers: hydratedManagerOffers,
    leagueOffers: leagueOffers.map((o: any) => ({
      ...o,
      player: playerMap.get(o.player_id) || null,
    })),
    stats: {
      activeBids: (bidsRes.data || []).length,
      bidExposure,
    },
  };
}

export async function placeBid(auctionId: string, profileId: string, bidAmount: number) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("place_market_bid", {
    p_auction_id: auctionId,
    p_amount: bidAmount,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}

export async function withdrawBid(auctionId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_market_bid", {
    p_auction_id: auctionId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}

export async function listPlayerForSale(
  rosterId: string,
  askingPrice: number,
  profileId: string,
) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("list_player_for_sale", {
    p_roster_id: rosterId,
    p_asking_price: askingPrice,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function withdrawPlayerListing(listingId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("withdraw_player_listing", {
    p_listing_id: listingId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}


export async function updatePlayerListingPrice(
  listingId: string,
  askingPrice: number,
  profileId: string,
) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_player_listing_price", {
    p_listing_id: listingId,
    p_asking_price: askingPrice,
  });

  if (error) return { success: false, error: error.message };

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
  const supabase = await createClient();

  const { error } = await supabase.rpc("make_manager_offer", {
    p_listing_id: listingId,
    p_amount: amount,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}


export async function updateManagerOffer(
  offerId: string,
  amount: number,
  profileId: string,
) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_manager_offer", {
    p_offer_id: offerId,
    p_amount: amount,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/market");
  return { success: true };
}

export async function acceptManagerOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_manager_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function rejectManagerOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_manager_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}

export async function acceptLeagueOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_league_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}

export async function rejectLeagueOffer(offerId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_league_offer", { p_offer_id: offerId });
  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  return { success: true };
}

export async function payReleaseClause(rosterId: string, profileId: string) {
  await requireUser(profileId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("pay_release_clause", {
    p_roster_id: rosterId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/market");
  revalidatePath("/team");
  return { success: true };
}