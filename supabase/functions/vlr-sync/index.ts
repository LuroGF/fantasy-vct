import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  getVlrMatchDetails,
  getVlrMatches,
  getVlrTeamRoster,
  type VlrMapPlayer,
  type VlrTeamRosterPlayer,
} from "../_shared/vlr.ts";

type SyncKind = "matches" | "stats";
type SyncResult = {
  summary: Record<string, number | string>;
  errors: string[];
  details?: unknown[];
};
type DbPlayer = {
  id: string;
  nickname: string;
  team_id: string | null;
  vlr_id: string | null;
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const normalizeName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function ensureTeamVlrId(
  supabase: SupabaseClient,
  vlrId: string,
  teamName: string,
) {
  const { data: existing } = await supabase
    .from("pro_teams")
    .select("id")
    .eq("vlr_id", vlrId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: teams, error } = await supabase
    .from("pro_teams")
    .select("id,name,vlr_id");
  if (error) throw error;

  const matches = (teams ?? []).filter(
    (team) => normalizeName(team.name) === normalizeName(teamName),
  );
  if (matches.length !== 1) return null;
  if (matches[0].vlr_id && String(matches[0].vlr_id) !== vlrId) return null;

  const { error: updateError } = await supabase
    .from("pro_teams")
    .update({ vlr_id: vlrId })
    .eq("id", matches[0].id)
    .is("vlr_id", null);
  if (updateError) throw updateError;
  return matches[0].id as string;
}

async function syncMatches(
  supabase: SupabaseClient,
  vlrApiUrl: string,
): Promise<SyncResult> {
  const [matches, gameweeksResult, seasonTeamsResult] = await Promise.all([
    getVlrMatches(vlrApiUrl),
    supabase.from("gameweeks").select("id,start_date,end_date").order("start_date"),
    supabase
      .from("vct_season_teams")
      .select("team_id")
      .eq("season_year", 2027)
      .eq("confirmation_status", "confirmed")
      .eq("fantasy_eligible", true),
  ]);
  if (gameweeksResult.error) throw gameweeksResult.error;
  if (seasonTeamsResult.error) throw seasonTeamsResult.error;

  const eligibleTeamIds = new Set(
    (seasonTeamsResult.data ?? []).map((row) => row.team_id),
  );
  const details: unknown[] = [];
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;
  let withoutGameweek = 0;

  for (const match of matches) {
    try {
      const matchDetails = await getVlrMatchDetails(vlrApiUrl, match.vlrId);
      if (!matchDetails || matchDetails.teams.length < 2) {
        skipped++;
        details.push({ vlrId: match.vlrId, status: "skipped", reason: "details unavailable" });
        continue;
      }

      const [teamA, teamB] = matchDetails.teams;
      const [teamAId, teamBId] = await Promise.all([
        ensureTeamVlrId(supabase, teamA.id, teamA.name),
        ensureTeamVlrId(supabase, teamB.id, teamB.name),
      ]);
      if (!teamAId || !teamBId || !eligibleTeamIds.has(teamAId) || !eligibleTeamIds.has(teamBId)) {
        skipped++;
        details.push({ vlrId: match.vlrId, status: "skipped", reason: "teams not eligible" });
        continue;
      }

      let date = match.matchDate;
      if (!date) {
        const existing = await supabase
          .from("matches")
          .select("match_date")
          .eq("vlr_id", match.vlrId)
          .maybeSingle();
        if (existing.error) throw existing.error;
        date = existing.data?.match_date ?? null;
      }
      if (!date) {
        skipped++;
        details.push({ vlrId: match.vlrId, status: "skipped", reason: "date unavailable" });
        continue;
      }

      const timestamp = new Date(date).getTime();
      const gameweek = (gameweeksResult.data ?? []).find(
        (row) =>
          timestamp >= new Date(row.start_date).getTime() &&
          timestamp <= new Date(row.end_date).getTime(),
      );
      if (!gameweek) withoutGameweek++;

      const detailedStatus = matchDetails.status.toLowerCase();
      const status = ["live", "finished", "completed"].includes(detailedStatus)
        ? detailedStatus
        : match.status;
      const { error } = await supabase.rpc("upsert_vlr_match", {
        p_vlr_id: match.vlrId,
        p_team_a_vlr_id: teamA.id,
        p_team_b_vlr_id: teamB.id,
        p_match_date: date,
        p_status: status,
        p_team_a_score: teamA.score ?? match.teamAScore,
        p_team_b_score: teamB.score ?? match.teamBScore,
        p_gameweek_id: gameweek?.id ?? null,
      });
      if (error) throw error;
      synced++;
      details.push({ vlrId: match.vlrId, status: "synced", gameweekId: gameweek?.id ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${match.vlrId}: ${message}`);
      details.push({ vlrId: match.vlrId, status: "error", reason: message });
    }
  }

  const engine = await supabase.rpc("run_gameweek_engine");
  if (engine.error) errors.push(`Gameweek engine: ${engine.error.message}`);

  return {
    summary: {
      executor: "supabase-edge",
      received: matches.length,
      synced,
      skipped,
      without_gameweek: withoutGameweek,
      errors: errors.length,
    },
    errors,
    details,
  };
}

function preferredRosterIds(
  roster: VlrTeamRosterPlayer[],
  playerName: string,
) {
  const matches = roster.filter(
    (player) => normalizeName(player.alias) === normalizeName(playerName),
  );
  const current = matches.filter((player) => player.status !== "former");
  return Array.from(new Set((current.length ? current : matches).map((player) => player.vlrId)));
}

async function syncStats(
  supabase: SupabaseClient,
  vlrApiUrl: string,
): Promise<SyncResult> {
  const recent = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const matchesResult = await supabase
    .from("matches")
    .select("id,vlr_id,gameweek_id")
    .eq("source", "vlr")
    .not("gameweek_id", "is", null)
    .gte("match_date", recent)
    .in("status", ["live", "finished", "completed"]);
  if (matchesResult.error) throw matchesResult.error;

  const errors: string[] = [];
  const rosterCache = new Map<string, VlrTeamRosterPlayer[]>();
  let matchesProcessed = 0;
  let performancesSynced = 0;
  let playersSkipped = 0;
  let mapsSkipped = 0;

  const rosterFor = async (teamId: string) => {
    if (!rosterCache.has(teamId)) {
      rosterCache.set(teamId, await getVlrTeamRoster(vlrApiUrl, teamId));
    }
    return rosterCache.get(teamId) ?? [];
  };

  for (const match of matchesResult.data ?? []) {
    try {
      if (!match.vlr_id) continue;
      const details = await getVlrMatchDetails(vlrApiUrl, match.vlr_id);
      if (!details) continue;
      matchesProcessed++;

      const [remoteA, remoteB] = details.teams;
      const teamsResult = await supabase
        .from("pro_teams")
        .select("id,vlr_id")
        .in("vlr_id", [remoteA.id, remoteB.id]);
      if (teamsResult.error) throw teamsResult.error;
      const teamA = teamsResult.data?.find((team) => String(team.vlr_id) === remoteA.id);
      const teamB = teamsResult.data?.find((team) => String(team.vlr_id) === remoteB.id);
      if (!teamA || !teamB) {
        errors.push(`${match.vlr_id}: teams not mapped`);
        continue;
      }

      const [rosterA, rosterB, currentPlayersResult] = await Promise.all([
        rosterFor(remoteA.id),
        rosterFor(remoteB.id),
        supabase
          .from("pro_players")
          .select("id,nickname,team_id,vlr_id")
          .in("team_id", [teamA.id, teamB.id]),
      ]);
      if (currentPlayersResult.error) throw currentPlayersResult.error;

      const allRosterIds = Array.from(new Set([...rosterA, ...rosterB].map((player) => player.vlrId)));
      const mappedPlayersResult = allRosterIds.length
        ? await supabase
            .from("pro_players")
            .select("id,nickname,team_id,vlr_id")
            .in("vlr_id", allRosterIds)
        : { data: [] as DbPlayer[], error: null };
      if (mappedPlayersResult.error) throw mappedPlayersResult.error;

      const players = Array.from(
        new Map(
          [...(currentPlayersResult.data ?? []), ...(mappedPlayersResult.data ?? [])].map(
            (player) => [player.id, player as DbPlayer],
          ),
        ).values(),
      );

      const resolvePlayer = (
        playerName: string,
        teamId: string,
        roster: VlrTeamRosterPlayer[],
      ) => {
        const ids = preferredRosterIds(roster, playerName);
        if (ids.length === 1) {
          const byId = players.find((player) => String(player.vlr_id ?? "") === ids[0]);
          if (byId) return byId;
        }
        const byName = players.filter(
          (player) =>
            player.team_id === teamId &&
            normalizeName(player.nickname) === normalizeName(playerName),
        );
        return byName.length === 1 ? byName[0] : null;
      };

      const processPlayers = async (
        mapName: string,
        rows: VlrMapPlayer[],
        teamId: string,
        roster: VlrTeamRosterPlayer[],
      ) => {
        for (const player of rows) {
          if (player.kills === null || player.deaths === null || player.assists === null) {
            playersSkipped++;
            continue;
          }
          const dbPlayer = resolvePlayer(player.name, teamId, roster);
          if (!dbPlayer) {
            playersSkipped++;
            errors.push(`${match.vlr_id} / ${mapName}: player not mapped: ${player.name}`);
            continue;
          }
          const write = await supabase.rpc("upsert_vlr_player_performance", {
            p_match_id: match.id,
            p_player_id: dbPlayer.id,
            p_map_name: mapName,
            p_agent_name: player.agent,
            p_kills: player.kills,
            p_deaths: player.deaths,
            p_assists: player.assists,
            p_clutches: 0,
            p_fb: player.fk ?? 0,
            p_fd: player.fd ?? 0,
            p_acs: player.acs ?? 0,
            p_mvp: false,
          });
          if (write.error) {
            errors.push(`${match.vlr_id} / ${mapName} / ${player.name}: ${write.error.message}`);
          } else {
            performancesSynced++;
          }
        }
      };

      for (const map of details.maps) {
        if (!map.mapName || map.mapName === "TBD") {
          mapsSkipped++;
          continue;
        }
        await processPlayers(map.mapName, map.players.team1, teamA.id, rosterA);
        await processPlayers(map.mapName, map.players.team2, teamB.id, rosterB);
      }

      const recalculate = await supabase.rpc("recalculate_gameweek_fantasy_points", {
        p_gameweek_id: match.gameweek_id,
      });
      if (recalculate.error) {
        errors.push(`${match.vlr_id}: score recalculation failed: ${recalculate.error.message}`);
      }
    } catch (error) {
      errors.push(`${match.vlr_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const engine = await supabase.rpc("run_gameweek_engine");
  if (engine.error) errors.push(`Gameweek engine: ${engine.error.message}`);

  return {
    summary: {
      executor: "supabase-edge",
      matches_processed: matchesProcessed,
      performances_synced: performancesSynced,
      players_skipped: playersSkipped,
      maps_skipped: mapsSkipped,
      errors: errors.length,
    },
    errors,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("VLR_SYNC_SECRET");
  if (!expectedSecret || request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return response({ error: "Unauthorized" }, 401);
  }

  const kind = new URL(request.url).searchParams.get("kind") as SyncKind | null;
  if (kind !== "matches" && kind !== "stats") {
    return response({ error: "kind must be matches or stats" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vlrApiUrl = Deno.env.get("VLR_API_URL");
  if (!supabaseUrl || !serviceRoleKey || !vlrApiUrl) {
    return response({ error: "Function environment is incomplete" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const start = await supabase.rpc("try_start_vct_sync_run", {
    p_sync_type: kind,
  });
  if (start.error) return response({ error: "Could not acquire sync lock" }, 500);
  if (!start.data) return response({ success: true, status: "skipped", reason: "already_running" }, 202);

  const runId = String(start.data);
  try {
    const result = kind === "matches"
      ? await syncMatches(supabase, vlrApiUrl)
      : await syncStats(supabase, vlrApiUrl);
    const status = result.errors.length ? "warning" : "success";
    await supabase.rpc("finish_vct_sync_run", {
      p_run_id: runId,
      p_status: status,
      p_summary: result.summary,
      p_errors: result.errors.slice(0, 100),
    });
    return response({ success: true, status, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.rpc("finish_vct_sync_run", {
      p_run_id: runId,
      p_status: "failed",
      p_summary: {},
      p_errors: [message],
    });
    console.error(`VLR ${kind} sync failed:`, message);
    return response({ success: false, error: "Synchronization failed" }, 500);
  }
});
