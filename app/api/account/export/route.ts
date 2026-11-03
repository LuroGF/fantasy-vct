import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const profileId = user.id;

  const results = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", profileId).maybeSingle(),
    supabaseAdmin
      .from("league_participants")
      .select("league_id, current_budget, total_points, transfers_made_this_week, created_at, leagues(name, creator_id, created_at)")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("user_rosters")
      .select("league_id, acquisition_price, is_active, is_starter, slot_type, release_clause, acquired_at, clause_protected_until, created_at, pro_players(nickname, full_name, role, pro_teams(name, tag, region))")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("participant_scores_history")
      .select("league_id, gameweek_id, points_earned, rank_in_league")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("gameweek_lineups")
      .select("league_id, gameweek_id, player_id, captured_at, pro_players(nickname, role, pro_teams(name, tag))")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("daily_bonus_claims")
      .select("reward_date, amount_per_league, league_count, total_awarded, claimed_at")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("notifications")
      .select("title, message, type, category, is_read, action_url, created_at")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("notification_preferences")
      .select("push_enabled, market_enabled, gameweek_enabled, social_enabled, daily_reward_enabled")
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabaseAdmin
      .from("market_transactions")
      .select("league_id, player_id, type, price, created_at")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("user_bids")
      .select("league_id, auction_id, amount, submitted_at")
      .eq("profile_id", profileId),
    supabaseAdmin
      .from("manager_offers")
      .select("league_id, player_id, from_profile_id, to_profile_id, amount, status, created_at, expires_at")
      .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`),
    supabaseAdmin
      .from("league_reports")
      .select("league_id, reporter_id, target_profile_id, reason, details, status, created_at, resolved_at")
      .or(`reporter_id.eq.${profileId},target_profile_id.eq.${profileId}`),
  ]) as QueryResult[];

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[ACCOUNT EXPORT] Query failed:", failed.error.message);
    return NextResponse.json(
      { error: "No se ha podido preparar la descarga." },
      { status: 500 },
    );
  }

  const managerOffers = (results[10].data as Record<string, unknown>[] | null)?.map((offer) => ({
    league_id: offer.league_id,
    player_id: offer.player_id,
    direction: offer.from_profile_id === profileId ? "sent" : "received",
    amount: offer.amount,
    status: offer.status,
    created_at: offer.created_at,
    expires_at: offer.expires_at,
  })) ?? [];

  const reports = (results[11].data as Record<string, unknown>[] | null)?.map((report) => ({
    league_id: report.league_id,
    involvement: report.reporter_id === profileId ? "reporter" : "reported",
    reason: report.reason,
    details: report.details,
    status: report.status,
    created_at: report.created_at,
    resolved_at: report.resolved_at,
  })) ?? [];

  const payload = {
    export_version: 1,
    generated_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: results[0].data,
    league_memberships: results[1].data ?? [],
    rosters: results[2].data ?? [],
    score_history: results[3].data ?? [],
    frozen_lineups: results[4].data ?? [],
    daily_rewards: results[5].data ?? [],
    notifications: results[6].data ?? [],
    notification_preferences: results[7].data,
    market_transactions: results[8].data ?? [],
    market_bids: results[9].data ?? [],
    manager_offers: managerOffers,
    league_reports: reports,
    excluded_for_security: [
      "password hashes",
      "authentication tokens",
      "push subscription encryption keys",
      "server and API secrets",
    ],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="mis-datos-fantasy-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
