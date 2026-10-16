import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getVlrMatchDetails } from "@/lib/vlr";

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

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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
    /*
     * Por ahora sincronizamos partidos VLR
     * que ya están en nuestra DB.
     *
     * Incluimos LIVE para poder probar,
     * aunque la sincronización final se
     * consolidará al terminar el partido.
     */
    const { data: matches, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          vlr_id,
          status,
          gameweek_id,
          team_a,
          team_b
        `,
      )
      .eq("source", "vlr")
      .in("status", ["live", "finished", "completed"]);

    if (matchesError) {
      throw matchesError;
    }

    let performancesSynced = 0;
    let playersSkipped = 0;
    let mapsSkipped = 0;
    let matchesProcessed = 0;

    const errors: string[] = [];

    for (const match of matches ?? []) {
      if (!match.vlr_id) {
        continue;
      }

      try {
        const details = await getVlrMatchDetails(match.vlr_id);

        if (!details) {
          continue;
        }

        matchesProcessed++;

        /*
         * Recuperamos los IDs internos de
         * ambos equipos mediante vlr_id.
         */
        const team1VlrId = details.teams[0]?.id;

        const team2VlrId = details.teams[1]?.id;

        const { data: dbTeams } = await supabaseAdmin
          .from("pro_teams")
          .select("id, vlr_id")
          .in("vlr_id", [team1VlrId, team2VlrId].filter(Boolean));

        const team1 = dbTeams?.find(
          (team) => String(team.vlr_id) === team1VlrId,
        );

        const team2 = dbTeams?.find(
          (team) => String(team.vlr_id) === team2VlrId,
        );

        if (!team1 || !team2) {
          errors.push(`${match.vlr_id}: teams not mapped`);

          continue;
        }

        /*
         * Cargamos jugadores de ambos equipos.
         */
        const { data: players } = await supabaseAdmin
          .from("pro_players")
          .select("id, nickname, team_id")
          .in("team_id", [team1.id, team2.id]);

        for (const map of details.maps) {
          /*
           * No guardamos mapas TBD ni mapas
           * sin estadísticas reales.
           */
          if (!map.mapName || map.mapName === "TBD") {
            mapsSkipped++;
            continue;
          }

          const processTeamPlayers = async (
            mapPlayers: typeof map.players.team1,
            teamId: string,
          ) => {
            for (const player of mapPlayers) {
              /*
               * Si todavía no hay stats,
               * no insertamos zeros falsos.
               */
              if (
                player.kills === null ||
                player.deaths === null ||
                player.assists === null
              ) {
                playersSkipped++;
                continue;
              }

              const dbPlayer = players?.find(
                (candidate) =>
                  candidate.team_id === teamId &&
                  normalizeName(candidate.nickname) ===
                    normalizeName(player.name),
              );

              if (!dbPlayer) {
                playersSkipped++;

                errors.push(
                  `${match.vlr_id} / ${map.mapName}: player not mapped: ${player.name}`,
                );

                continue;
              }

              const { error } = await supabaseAdmin.rpc(
                "upsert_vlr_player_performance",
                {
                  p_match_id: match.id,

                  p_player_id: dbPlayer.id,

                  p_map_name: map.mapName,

                  p_agent_name: player.agent,

                  p_kills: player.kills ?? 0,

                  p_deaths: player.deaths ?? 0,

                  p_assists: player.assists ?? 0,

                  p_fb: player.fk ?? 0,

                  p_fd: player.fd ?? 0,

                  p_acs: player.acs ?? 0,

                  /*
                   * Esta API no nos está dando
                   * clutches directamente.
                   * De momento dejamos 0.
                   */
                  p_clutches: 0,

                  /*
                   * MVP lo resolveremos después
                   * con una regla propia.
                   */
                  p_mvp: false,
                },
              );

              if (error) {
                errors.push(
                  `${match.vlr_id} / ${map.mapName} / ${player.name}: ${error.message}`,
                );

                continue;
              }

              performancesSynced++;
            }
          };

          await processTeamPlayers(map.players.team1, team1.id);

          await processTeamPlayers(map.players.team2, team2.id);
        }

        /*
         * Si el partido pertenece a una jornada,
         * recalculamos sus puntos.
         *
         * Esto permite:
         * - puntuación provisional durante LIVE
         * - puntuación definitiva al terminar
         */
        if (match.gameweek_id) {
          const { error } = await supabaseAdmin.rpc(
            "recalculate_gameweek_fantasy_points",
            {
              p_gameweek_id: match.gameweek_id,
            },
          );

          if (error) {
            errors.push(
              `${match.vlr_id}: score recalculation failed: ${error.message}`,
            );
          }
        }
      } catch (error) {
        errors.push(
          `${match.vlr_id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    const { error: gameweekEngineError } = await supabaseAdmin.rpc(
      "run_gameweek_engine",
    );

    if (gameweekEngineError) {
      errors.push(`Gameweek engine: ${gameweekEngineError.message}`);
    }

    return NextResponse.json({
      success: true,

      matchesProcessed,

      performancesSynced,

      playersSkipped,

      mapsSkipped,

      errors,
    });
  } catch (error) {
    console.error("VLR stats sync failed:", error);

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
