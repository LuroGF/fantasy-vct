import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getVlrMatches, getVlrMatchDetails } from "@/lib/vlr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function ensureTeamVlrId(
  vlrId: string,
  teamName: string,
): Promise<string | null> {
  // ¿Ya existe ese vlr_id?
  const { data: existingByVlr } = await supabaseAdmin
    .from("pro_teams")
    .select("id")
    .eq("vlr_id", vlrId)
    .maybeSingle();

  if (existingByVlr) {
    return existingByVlr.id;
  }

  // Intentamos localizarlo por nombre.
  const { data: teams, error } = await supabaseAdmin
    .from("pro_teams")
    .select("id, name, vlr_id");

  if (error || !teams) {
    return null;
  }

  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

  const targetName = normalize(teamName);

  const matches = teams.filter((team) => normalize(team.name) === targetName);

  // Queremos una coincidencia inequívoca.
  if (matches.length !== 1) {
    return null;
  }

  const team = matches[0];

  // Si ya tiene otro ID VLR, no lo pisamos.
  if (team.vlr_id && String(team.vlr_id) !== vlrId) {
    return null;
  }

  const { error: updateError } = await supabaseAdmin
    .from("pro_teams")
    .update({
      vlr_id: vlrId,
    })
    .eq("id", team.id);

  return updateError ? null : team.id;
}

async function syncVlrMatches(request: Request) {
  const authorization = request.headers.get("authorization");

  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const matches = await getVlrMatches();

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    const { data: gameweeks, error: gameweeksError } = await supabaseAdmin
      .from("gameweeks")
      .select("id, start_date, end_date")
      .order("start_date", { ascending: true });

    if (gameweeksError) {
      throw new Error(`Could not load gameweeks: ${gameweeksError.message}`);
    }

    const { data: seasonTeams, error: seasonTeamsError } = await supabaseAdmin
      .from("vct_season_teams")
      .select("team_id")
      .eq("season_year", 2027)
      .eq("confirmation_status", "confirmed")
      .eq("fantasy_eligible", true);

    if (seasonTeamsError) {
      throw new Error(
        `Could not load eligible VCT 2027 teams: ${seasonTeamsError.message}`,
      );
    }

    const eligibleTeamIds = new Set(
      (seasonTeams || []).map((entry) => entry.team_id),
    );

    const details: Array<{
      vlrId: string;
      status: "synced" | "skipped" | "error";
      reason?: string;
      gameweekId?: number | null;
    }> = [];

    for (const match of matches) {
      try {
        /*
         * El listado general no trae IDs
         * de equipos.
         *
         * Los recuperamos desde:
         * /v2/match/details
         */
        const matchDetails = await getVlrMatchDetails(match.vlrId);

        if (!matchDetails || matchDetails.teams.length < 2) {
          skipped++;

          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: "Match details or teams not available",
          });

          continue;
        }

        const teamA = matchDetails.teams[0];

        const teamB = matchDetails.teams[1];

        if (!teamA.id || !teamB.id) {
          skipped++;

          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: "Missing team VLR ids in match details",
          });

          continue;
        }

        const teamAId = await ensureTeamVlrId(teamA.id, teamA.name);

        const teamBId = await ensureTeamVlrId(teamB.id, teamB.name);

        if (!teamAId || !teamBId) {
          skipped++;

          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: `Teams not included in Fantasy VCT: ${teamA.name} (${teamA.id}) vs ${teamB.name} (${teamB.id})`,
          });

          continue;
        }

        if (!eligibleTeamIds.has(teamAId) || !eligibleTeamIds.has(teamBId)) {
          skipped++;

          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: `At least one team is not an eligible VCT 2027 partner: ${teamA.name} vs ${teamB.name}`,
          });

          continue;
        }

        /*
         * Preferimos scores del detalle
         * si están disponibles.
         */
        const teamAScore = teamA.score ?? match.teamAScore;

        const teamBScore = teamB.score ?? match.teamBScore;

        /*
         * El estado detallado tiene prioridad.
         */
        let status: "upcoming" | "live" | "finished" | "completed" =
          match.status;

        const detailedStatus = matchDetails.status.toLowerCase();

        if (detailedStatus === "completed") {
          status = "completed";
        } else if (detailedStatus === "finished") {
          status = "finished";
        } else if (detailedStatus === "live") {
          status = "live";
        }
        /*
         * Algunos resultados terminados pueden venir desde VLR
         * sin unix_timestamp.
         *
         * Si ya conocemos el partido, conservamos la fecha que
         * tenemos guardada en Supabase.
         */
        let matchDate = match.matchDate;

        if (!matchDate) {
          const { data: existingMatch, error: existingMatchError } =
            await supabaseAdmin
              .from("matches")
              .select("match_date")
              .eq("vlr_id", match.vlrId)
              .maybeSingle();

          if (existingMatchError) {
            errors++;

            details.push({
              vlrId: match.vlrId,
              status: "error",
              reason: `Could not recover existing match date: ${existingMatchError.message}`,
            });

            continue;
          }

          if (!existingMatch?.match_date) {
            skipped++;

            details.push({
              vlrId: match.vlrId,
              status: "skipped",
              reason:
                "Completed match has no date and was not previously synced",
            });

            continue;
          }

          matchDate = existingMatch.match_date;
        }

        if (!matchDate) {
          skipped++;
          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: "Match date is not available",
          });
          continue;
        }

        const matchTimestamp = new Date(matchDate).getTime();
        const gameweek = (gameweeks || []).find((candidate) => {
          const startsAt = new Date(candidate.start_date).getTime();
          const endsAt = new Date(candidate.end_date).getTime();
          return matchTimestamp >= startsAt && matchTimestamp <= endsAt;
        });

        const { error } = await supabaseAdmin.rpc("upsert_vlr_match", {
          p_vlr_id: match.vlrId,

          p_team_a_vlr_id: teamA.id,

          p_team_b_vlr_id: teamB.id,

          p_match_date: matchDate,
          p_status: status,

          p_team_a_score: teamAScore,

          p_team_b_score: teamBScore,

          p_gameweek_id: gameweek?.id ?? null,
        });

        if (error) {
          errors++;

          details.push({
            vlrId: match.vlrId,
            status: "error",
            reason: error.message,
          });

          continue;
        }

        synced++;

        details.push({
          vlrId: match.vlrId,
          status: "synced",
          gameweekId: gameweek?.id ?? null,
          ...(!gameweek
            ? { reason: "Match date is outside the configured gameweek calendar" }
            : {}),
        });
      } catch (error) {
        errors++;

        details.push({
          vlrId: match.vlrId,
          status: "error",
          reason:
            error instanceof Error ? error.message : "Unknown match sync error",
        });
      }
    }
    const { error: gameweekEngineError } = await supabaseAdmin.rpc(
      "run_gameweek_engine",
    );

    if (gameweekEngineError) {
      console.error(
        "Gameweek engine failed after VLR sync:",
        gameweekEngineError,
      );
    }
    return NextResponse.json({
      success: true,
      received: matches.length,
      synced,
      skipped,
      errors,
      details,
    });
  } catch (error) {
    console.error("VLR sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se ha podido completar la sincronización de partidos.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: Request) {
  return syncVlrMatches(request);
}

export async function POST(request: Request) {
  return syncVlrMatches(request);
}
