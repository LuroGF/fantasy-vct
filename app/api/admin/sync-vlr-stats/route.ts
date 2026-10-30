import { NextResponse } from "next/server";

import {
  getVlrMatchDetails,
  getVlrTeamRoster,
  type VlrTeamRosterPlayer,
} from "@/lib/vlr";
import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  finishVctSyncRun,
  startVctSyncRun,
  syncErrorMessage,
} from "@/lib/operations/sync-runs";

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type DbPlayer = {
  id: string;
  nickname: string;
  team_id: string | null;
  vlr_id: string | null;
};

async function syncVlrStats(request: Request) {
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

  const runId = await startVctSyncRun("stats");

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
          team_b,
          match_date
        `,
      )
      .eq("source", "vlr")
      .not("gameweek_id", "is", null)
      .gte(
        "match_date",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .in("status", ["live", "finished", "completed"]);

    if (matchesError) {
      throw matchesError;
    }

    let performancesSynced = 0;
    let playersSkipped = 0;
    let mapsSkipped = 0;
    let matchesProcessed = 0;
    let playerIdsLinked = 0;
    let playersResolvedByFallback = 0;

    const errors: string[] = [];
    const rosterCache = new Map<string, VlrTeamRosterPlayer[]>();

    const getCachedRoster = async (teamVlrId: string) => {
      const cached = rosterCache.get(teamVlrId);

      if (cached) {
        return cached;
      }

      const roster = await getVlrTeamRoster(teamVlrId);
      rosterCache.set(teamVlrId, roster);

      return roster;
    };

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

        if (!team1VlrId || !team2VlrId) {
          errors.push(`${match.vlr_id}: team VLR ids missing in details`);
          continue;
        }

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

        const [team1Roster, team2Roster] = await Promise.all([
          getCachedRoster(team1VlrId),
          getCachedRoster(team2VlrId),
        ]);

        const rosterByTeamId = new Map<string, VlrTeamRosterPlayer[]>([
          [team1.id, team1Roster],
          [team2.id, team2Roster],
        ]);

        const rosterVlrIds = Array.from(
          new Set(
            [...team1Roster, ...team2Roster].map((player) => player.vlrId),
          ),
        );

        const { data: currentTeamPlayers, error: currentTeamPlayersError } =
          await supabaseAdmin
            .from("pro_players")
            .select("id, nickname, team_id, vlr_id")
            .in("team_id", [team1.id, team2.id]);

        if (currentTeamPlayersError) {
          throw currentTeamPlayersError;
        }

        const { data: playersByVlrId, error: playersByVlrIdError } =
          rosterVlrIds.length > 0
            ? await supabaseAdmin
                .from("pro_players")
                .select("id, nickname, team_id, vlr_id")
                .in("vlr_id", rosterVlrIds)
            : { data: [] as DbPlayer[], error: null };

        if (playersByVlrIdError) {
          throw playersByVlrIdError;
        }

        const players = Array.from(
          new Map(
            [...(currentTeamPlayers ?? []), ...(playersByVlrId ?? [])].map(
              (player) => [player.id, player as DbPlayer],
            ),
          ).values(),
        );

        const resolvePlayer = async (
          playerName: string,
          teamId: string,
        ): Promise<DbPlayer | null> => {
          const normalizedPlayerName = normalizeName(playerName);
          const roster = rosterByTeamId.get(teamId) ?? [];
          const aliasMatches = roster.filter(
            (candidate) =>
              normalizeName(candidate.alias) === normalizedPlayerName,
          );
          const currentRosterMatches = aliasMatches.filter(
            (candidate) => candidate.status !== "former",
          );
          const preferredMatches =
            currentRosterMatches.length > 0
              ? currentRosterMatches
              : aliasMatches;
          const rosterIds = Array.from(
            new Set(preferredMatches.map((candidate) => candidate.vlrId)),
          );

          if (rosterIds.length === 1) {
            const vlrId = rosterIds[0];
            const byVlrId = players.find(
              (candidate) => String(candidate.vlr_id ?? "") === vlrId,
            );

            if (byVlrId) {
              return byVlrId;
            }

            const nicknameMatches = players.filter(
              (candidate) =>
                candidate.team_id === teamId &&
                normalizeName(candidate.nickname) === normalizedPlayerName,
            );

            if (nicknameMatches.length !== 1) {
              return null;
            }

            const fallback = nicknameMatches[0];

            if (fallback.vlr_id && String(fallback.vlr_id) !== vlrId) {
              errors.push(
                `${match.vlr_id}: conflicting VLR id for ${playerName}: ${fallback.vlr_id} != ${vlrId}`,
              );
              return null;
            }

            if (!fallback.vlr_id) {
              const { error: linkError } = await supabaseAdmin
                .from("pro_players")
                .update({ vlr_id: vlrId })
                .eq("id", fallback.id)
                .is("vlr_id", null);

              if (linkError) {
                errors.push(
                  `${match.vlr_id}: could not link ${playerName} to VLR ${vlrId}: ${linkError.message}`,
                );
                return null;
              }

              fallback.vlr_id = vlrId;
              playerIdsLinked++;
            }

            return fallback;
          }

          if (rosterIds.length > 1) {
            errors.push(
              `${match.vlr_id}: ambiguous VLR roster identity for ${playerName}: ${rosterIds.join(", ")}`,
            );
            return null;
          }

          const nicknameMatches = players.filter(
            (candidate) =>
              candidate.team_id === teamId &&
              normalizeName(candidate.nickname) === normalizedPlayerName,
          );

          if (nicknameMatches.length === 1) {
            playersResolvedByFallback++;
            return nicknameMatches[0];
          }

          return null;
        };

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

              const dbPlayer = await resolvePlayer(player.name, teamId);

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

    await finishVctSyncRun(
      runId,
      errors.length > 0 ? "warning" : "success",
      {
        matches_processed: matchesProcessed,
        performances_synced: performancesSynced,
        player_ids_linked: playerIdsLinked,
        players_resolved_by_fallback: playersResolvedByFallback,
        players_skipped: playersSkipped,
        maps_skipped: mapsSkipped,
        errors: errors.length,
      },
      errors,
    );

    return NextResponse.json({
      success: true,

      matchesProcessed,

      performancesSynced,

      playerIdsLinked,

      playersResolvedByFallback,

      playersSkipped,

      mapsSkipped,

      errors,
    });
  } catch (error) {
    console.error("VLR stats sync failed:", error);

    await finishVctSyncRun(runId, "failed", {}, [syncErrorMessage(error)]);

    return NextResponse.json(
      {
        success: false,
        error: "No se ha podido completar la sincronización de estadísticas.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: Request) {
  return syncVlrStats(request);
}

export async function POST(request: Request) {
  return syncVlrStats(request);
}
