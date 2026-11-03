require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [
  ["profiles", () => supabase.from("profiles").select("*").limit(0)],
  ["league_participants", () => supabase.from("league_participants").select("league_id, current_budget, total_points, transfers_made_this_week, created_at, leagues(name, creator_id, created_at)").limit(0)],
  ["user_rosters", () => supabase.from("user_rosters").select("league_id, acquisition_price, is_active, is_starter, slot_type, release_clause, acquired_at, clause_protected_until, created_at, pro_players(nickname, full_name, role, pro_teams(name, tag, region))").limit(0)],
  ["participant_scores_history", () => supabase.from("participant_scores_history").select("league_id, gameweek_id, points_earned, rank_in_league").limit(0)],
  ["gameweek_lineups", () => supabase.from("gameweek_lineups").select("league_id, gameweek_id, player_id, captured_at, pro_players(nickname, role, pro_teams(name, tag))").limit(0)],
  ["daily_bonus_claims", () => supabase.from("daily_bonus_claims").select("reward_date, amount_per_league, league_count, total_awarded, claimed_at").limit(0)],
  ["notifications", () => supabase.from("notifications").select("title, message, type, category, is_read, action_url, created_at").limit(0)],
  ["notification_preferences", () => supabase.from("notification_preferences").select("push_enabled, market_enabled, gameweek_enabled, social_enabled, daily_reward_enabled").limit(0)],
  ["market_transactions", () => supabase.from("market_transactions").select("league_id, player_id, type, price, created_at").limit(0)],
  ["user_bids", () => supabase.from("user_bids").select("league_id, auction_id, amount, submitted_at").limit(0)],
  ["manager_offers", () => supabase.from("manager_offers").select("league_id, player_id, from_profile_id, to_profile_id, amount, status, created_at, expires_at").limit(0)],
  ["league_reports", () => supabase.from("league_reports").select("league_id, reporter_id, target_profile_id, reason, details, status, created_at, resolved_at").limit(0)],
];

async function main() {
  const failures = [];

  for (const [name, query] of checks) {
    const { error } = await query();
    if (error) failures.push({ name, message: error.message });
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ status: "failed", failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ status: "passed", checks: checks.length }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
