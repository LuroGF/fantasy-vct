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
): Promise<boolean> {
  // ¿Ya existe ese vlr_id?
  const { data: existingByVlr } = await supabaseAdmin
    .from("pro_teams")
    .select("id")
    .eq("vlr_id", vlrId)
    .maybeSingle();

  if (existingByVlr) {
    return true;
  }

  // Intentamos localizarlo por nombre.
  const { data: teams, error } = await supabaseAdmin
    .from("pro_teams")
    .select("id, name, vlr_id");

  if (error || !teams) {
    return false;
  }

  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

  const targetName = normalize(teamName);

  const matches = teams.filter((team) => normalize(team.name) === targetName);

  // Queremos una coincidencia inequívoca.
  if (matches.length !== 1) {
    return false;
  }

  const team = matches[0];

  // Si ya tiene otro ID VLR, no lo pisamos.
  if (team.vlr_id && String(team.vlr_id) !== vlrId) {
    return false;
  }

  const { error: updateError } = await supabaseAdmin
    .from("pro_teams")
    .update({
      vlr_id: vlrId,
    })
    .eq("id", team.id);

  return !updateError;
}

export async function POST(request: Request) {
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

    const details: Array<{
      vlrId: string;
      status: "synced" | "skipped" | "error";
      reason?: string;
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

        const teamAReady = await ensureTeamVlrId(teamA.id, teamA.name);

        const teamBReady = await ensureTeamVlrId(teamB.id, teamB.name);

        if (!teamAReady || !teamBReady) {
          skipped++;

          details.push({
            vlrId: match.vlrId,
            status: "skipped",
            reason: `Teams not included in Fantasy VCT: ${teamA.name} (${teamA.id}) vs ${teamB.name} (${teamB.id})`,
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

        const { error } = await supabaseAdmin.rpc("upsert_vlr_match", {
          p_vlr_id: match.vlrId,

          p_team_a_vlr_id: teamA.id,

          p_team_b_vlr_id: teamB.id,

          p_match_date: match.matchDate,

          p_status: status,

          p_team_a_score: teamAScore,

          p_team_b_score: teamBScore,

          p_gameweek_id: null,
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

        error: error instanceof Error ? error.message : "Unknown sync error",
      },
      {
        status: 500,
      },
    );
  }
}
