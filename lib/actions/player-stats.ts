"use server";

import { createClient } from "@/utils/supabase/server";
import { getSession } from "./auth";

function acsBonus(acs: number) {
  if (acs >= 300) return 5;
  if (acs >= 250) return 3;
  if (acs >= 200) return 1;
  if (acs < 150) return -1;
  return 0;
}

function aggregateByMatch(rows: any[]) {
  const matches = new Map<string, any>();

  for (const row of rows) {
    if (!row.match_id || !row.matches) continue;

    const current = matches.get(row.match_id) ?? {
      id: row.match_id,
      match_id: row.match_id,
      matches: row.matches,
      maps_played: 0,
      map_names: [] as string[],
      agent_names: [] as string[],
      kills: 0,
      deaths: 0,
      assists: 0,
      fb: 0,
      fd: 0,
      acs_total: 0,
      fantasy_points: 0,
      score_breakdown: {
        combat: 0,
        assists: 0,
        first_duels: 0,
        acs: 0,
      },
    };

    const kills = Number(row.kills ?? 0);
    const deaths = Number(row.deaths ?? 0);
    const assists = Number(row.assists ?? 0);
    const fb = Number(row.fb ?? 0);
    const fd = Number(row.fd ?? 0);
    const acs = Number(row.acs ?? 0);

    current.maps_played += 1;
    if (row.map_name && !current.map_names.includes(row.map_name)) {
      current.map_names.push(row.map_name);
    }
    if (row.agent_name && !current.agent_names.includes(row.agent_name)) {
      current.agent_names.push(row.agent_name);
    }
    current.kills += kills;
    current.deaths += deaths;
    current.assists += assists;
    current.fb += fb;
    current.fd += fd;
    current.acs_total += acs;
    current.fantasy_points += Number(row.fantasy_points ?? 0);
    current.score_breakdown.combat += kills * 2 - deaths;
    current.score_breakdown.assists += assists;
    current.score_breakdown.first_duels += fb * 2 - fd;
    current.score_breakdown.acs += acsBonus(acs);

    matches.set(row.match_id, current);
  }

  return Array.from(matches.values())
    .map((performance) => ({
      ...performance,
      acs: performance.maps_played
        ? Math.round(performance.acs_total / performance.maps_played)
        : 0,
    }))
    .sort(
      (a, b) =>
        new Date(b.matches.match_date).getTime() -
        new Date(a.matches.match_date).getTime(),
    );
}

export async function getPlayerStats(playerId: string, leagueId?: string | null) {
  const supabase = await createClient();

  try {
    const { data: player, error: playerError } = await supabase
      .from("pro_players")
      .select(`
        *,
        pro_teams (
          id,
          name,
          tag,
          logo_url,
          region
        )
      `)
      .eq("id", playerId)
      .single();

    if (playerError) throw playerError;

    const [performanceResult, seasonResult] = await Promise.all([
      supabase
        .from("player_performances")
        .select(`
          id,
          match_id,
          map_name,
          agent_name,
          kills,
          deaths,
          assists,
          fb,
          fd,
          acs,
          fantasy_points,
          matches!inner (
            id,
            match_date,
            status,
            team_a,
            team_b,
            team_a_score,
            team_b_score,
            pro_teams_team_a:team_a (id, name, tag, logo_url),
            pro_teams_team_b:team_b (id, name, tag, logo_url)
          )
        `)
        .eq("player_id", playerId)
        .gte("matches.match_date", "2027-01-01T00:00:00.000Z")
        .order("created_at", { ascending: false }),
      supabase
        .from("vct_season_players")
        .select("roster_status,market_eligible,source_url,confirmed_at")
        .eq("season_year", 2027)
        .eq("player_id", playerId)
        .maybeSingle(),
    ]);

    if (performanceResult.error) throw performanceResult.error;

    const performances = aggregateByMatch(performanceResult.data ?? []);
    const totalMatches = performances.length;
    const totalPoints = performances.reduce(
      (sum, performance) => sum + Number(performance.fantasy_points ?? 0),
      0,
    );
    const totalKills = performances.reduce(
      (sum, performance) => sum + Number(performance.kills ?? 0),
      0,
    );
    const totalDeaths = performances.reduce(
      (sum, performance) => sum + Number(performance.deaths ?? 0),
      0,
    );
    const totalAcs = performances.reduce(
      (sum, performance) => sum + Number(performance.acs ?? 0),
      0,
    );
    const lastFive = performances.slice(0, 5);
    const lastFiveAverage = lastFive.length
      ? lastFive.reduce(
          (sum, performance) => sum + Number(performance.fantasy_points ?? 0),
          0,
        ) / lastFive.length
      : null;
    const recentWindow = performances.slice(0, 3);
    const previousWindow = performances.slice(3, 6);
    const recentAverage = recentWindow.length
      ? recentWindow.reduce(
          (sum, performance) => sum + Number(performance.fantasy_points ?? 0),
          0,
        ) / recentWindow.length
      : null;
    const previousAverage = previousWindow.length
      ? previousWindow.reduce(
          (sum, performance) => sum + Number(performance.fantasy_points ?? 0),
          0,
        ) / previousWindow.length
      : null;
    const trendDelta =
      recentAverage !== null && previousAverage !== null
        ? recentAverage - previousAverage
        : null;

    const stats = {
      has_data: totalMatches > 0,
      total_matches: totalMatches,
      total_points: totalPoints,
      avg_points: totalMatches
        ? Number((totalPoints / totalMatches).toFixed(1))
        : null,
      avg_kd: totalMatches
        ? Number((totalKills / Math.max(totalDeaths, 1)).toFixed(2))
        : null,
      avg_acs: totalMatches ? Math.round(totalAcs / totalMatches) : null,
      best_points: totalMatches
        ? Math.max(...performances.map((performance) => performance.fantasy_points ?? 0))
        : null,
      last_5_avg:
        lastFiveAverage === null ? null : Number(lastFiveAverage.toFixed(1)),
      last_5_points: lastFive
        .slice()
        .reverse()
        .map((performance) => Number(performance.fantasy_points ?? 0)),
      trend:
        trendDelta === null
          ? "unavailable"
          : trendDelta > 3
            ? "up"
            : trendDelta < -3
              ? "down"
              : "stable",
      trend_delta: trendDelta === null ? null : Number(trendDelta.toFixed(1)),
    };

    let nextMatch: any = null;
    if (player.team_id) {
      const { data } = await supabase
        .from("matches")
        .select(`
          id,
          match_date,
          status,
          team_a,
          team_b,
          pro_teams_team_a:team_a (id, name, tag, logo_url),
          pro_teams_team_b:team_b (id, name, tag, logo_url)
        `)
        .or(`team_a.eq.${player.team_id},team_b.eq.${player.team_id}`)
        .gte("match_date", "2027-01-01T00:00:00.000Z")
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      nextMatch = data ?? null;
    }

    let leagueContext: any = null;
    const cleanLeagueId = leagueId?.trim();
    const session = cleanLeagueId ? await getSession() : null;

    if (cleanLeagueId && session) {
      const { data: membership } = await supabase
        .from("league_participants")
        .select("league_id,leagues(id,name)")
        .eq("league_id", cleanLeagueId)
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (membership) {
        const [rosterResult, auctionResult, listingResult] = await Promise.all([
          supabase
            .from("user_rosters")
            .select(
              "id,profile_id,release_clause,slot_type,is_starter,clause_protected_until",
            )
            .eq("league_id", cleanLeagueId)
            .eq("player_id", playerId)
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("market_auctions")
            .select("id,market_value_snapshot,ends_at,status")
            .eq("league_id", cleanLeagueId)
            .eq("player_id", playerId)
            .eq("status", "open")
            .gt("ends_at", new Date().toISOString())
            .order("ends_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("player_listings")
            .select("id,owner_profile_id,asking_price,expires_at,status")
            .eq("league_id", cleanLeagueId)
            .eq("player_id", playerId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle(),
        ]);

        const roster = rosterResult.data ?? null;
        const auction = auctionResult.data ?? null;
        const listing = listingResult.data ?? null;
        let owner: any = null;
        let myBid: any = null;

        if (roster?.profile_id) {
          const { data } = await supabase
            .from("profiles")
            .select("id,username")
            .eq("id", roster.profile_id)
            .maybeSingle();
          owner = data ?? null;
        }

        if (auction?.id) {
          const { data } = await supabase
            .from("user_bids")
            .select("amount,submitted_at")
            .eq("auction_id", auction.id)
            .eq("profile_id", session.user.id)
            .maybeSingle();
          myBid = data ?? null;
        }

        leagueContext = {
          league: Array.isArray(membership.leagues)
            ? membership.leagues[0]
            : membership.leagues,
          roster,
          owner,
          is_mine: roster?.profile_id === session.user.id,
          auction,
          my_bid: myBid,
          listing,
        };
      }
    }

    return {
      success: true,
      data: {
        player,
        performances,
        stats,
        season: seasonResult.data ?? null,
        next_match: nextMatch,
        league_context: leagueContext,
      },
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return { success: false, error: "Error al cargar estadísticas del jugador" };
  }
}
