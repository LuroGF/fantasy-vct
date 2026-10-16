"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";

// ============================================================
// GLOBAL RANK
// ============================================================

export async function getGlobalRank(userId: string) {
  const supabase = await createClient();

  const { data: userProfile, error: profileError } =
    await supabase
      .from("profiles")
      .select("global_points")
      .eq("id", userId)
      .single();

  if (profileError || !userProfile) {
    return 0;
  }

  const { count, error: countError } =
    await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gt(
        "global_points",
        userProfile.global_points ?? 0,
      );

  if (countError) {
    console.error(
      "Error calculando ranking global:",
      countError,
    );

    return 0;
  }

  return (count ?? 0) + 1;
}

// ============================================================
// CREATE LEAGUE
// ============================================================
//
// Toda la lógica importante ocurre ahora dentro de:
//
// create_fantasy_league()
//
// PostgreSQL:
// - crea la liga
// - genera invite_code
// - añade al creador
// - asigna 50 M€
// - reparte 5 jugadores totalmente aleatorios
// - los pone como titulares
// - asigna cláusula inicial
// - activa protección de 48 horas
//
// ============================================================

export async function createLeague(
  name: string,
  userId: string,
) {
  const session = await getSession();

  if (
    !session ||
    session.user.id !== userId
  ) {
    throw new Error(
      "Acceso no autorizado",
    );
  }

  const cleanName = name.trim();

  if (cleanName.length < 3) {
    return {
      success: false,
      error:
        "El nombre de la liga debe tener al menos 3 caracteres.",
    };
  }

  const supabase =
    await createClient();

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "create_fantasy_league",
      {
        p_name: cleanName,
      },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/");
    revalidatePath("/leagues");
    revalidatePath("/team");
    revalidatePath("/market");

    return {
      success: true,

      league: {
        id: data?.league_id,
        name: cleanName,
        invite_code:
          data?.invite_code,
        budget_limit:
          data?.starting_budget ??
          50_000_000,
      },

      data,
    };
  } catch (error) {
    console.error(
      "Error creating league:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Error al crear la liga";

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================
// JOIN LEAGUE
// ============================================================
//
// Ya NO:
// - buscamos manualmente la liga
// - calculamos presupuesto medio
// - hacemos late join adjustment
// - repartimos jugadores desde TypeScript
//
// PostgreSQL se encarga de todo.
// ============================================================

export async function joinLeague(
  inviteCode: string,
  userId: string,
) {
  const session = await getSession();

  if (
    !session ||
    session.user.id !== userId
  ) {
    throw new Error(
      "Acceso no autorizado",
    );
  }

  const cleanCode =
    inviteCode
      .trim()
      .toUpperCase();

  if (!cleanCode) {
    return {
      success: false,
      error:
        "Introduce un código de invitación.",
    };
  }

  const supabase =
    await createClient();

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      "join_fantasy_league",
      {
        p_invite_code:
          cleanCode,
      },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/");
    revalidatePath("/leagues");
    revalidatePath("/team");
    revalidatePath("/market");

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      "Error joining league:",
      error,
    );

    const rawMessage =
      error instanceof Error
        ? error.message
        : "Error al unirse a la liga";

    let message = rawMessage;

    if (
      rawMessage.includes(
        "Invalid invitation code",
      )
    ) {
      message =
        "Código de invitación no válido.";
    }

    if (
      rawMessage.includes(
        "You already belong to this league",
      )
    ) {
      message =
        "Ya perteneces a esta liga.";
    }

    if (
      rawMessage.includes(
        "League is full",
      )
    ) {
      message =
        "La liga está completa.";
    }

    if (
      rawMessage.includes(
        "Not enough free players",
      )
    ) {
      message =
        "No quedan suficientes jugadores libres para entrar en esta liga.";
    }

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================
// GET USER LEAGUES
// ============================================================

export async function getUserLeagues(
  userId: string,
) {
  const session = await getSession();

  if (
    !session ||
    session.user.id !== userId
  ) {
    return [];
  }

  const supabase =
    await createClient();

  const {
    data: participations,
    error,
  } = await supabase
    .from("league_participants")
    .select(`
      current_budget,
      transfers_made_this_week,
      total_points,
      league_id,
      leagues (
        id,
        name,
        invite_code,
        creator_id,
        max_participants,
        budget_limit,
        is_public,
        created_at
      )
    `)
    .eq(
      "profile_id",
      userId,
    );

  if (error) {
    console.error(
      "Error fetching leagues:",
      error,
    );

    return [];
  }

  return participations ?? [];
}

// ============================================================
// GET LEAGUE CLASSIFICATION
// ============================================================
//
// V1:
//
// - clasificación
// - roster de cada manager
//
// NO:
// - powerups
// - locks
// - casters
// ============================================================

export async function getLeagueClassification(
  leagueId: string,
) {
  const session =
    await getSession();

  if (!session) {
    throw new Error(
      "Acceso no autorizado",
    );
  }

  const supabase =
    await createClient();

  // ==========================================================
  // Comprobar que pertenece a la liga
  // ==========================================================

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("league_participants")
    .select("profile_id")
    .eq(
      "league_id",
      leagueId,
    )
    .eq(
      "profile_id",
      session.user.id,
    )
    .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    throw new Error(
      "No perteneces a esta liga",
    );
  }

  // ==========================================================
  // PARTICIPANTES
  // ==========================================================

  const {
    data: participants,
    error: participantsError,
  } = await supabase
    .from("league_participants")
    .select(`
      profile_id,
      current_budget,
      total_points,
      profiles (
        id,
        username,
        avatar_url
      )
    `)
    .eq(
      "league_id",
      leagueId,
    )
    .order(
      "total_points",
      {
        ascending: false,
      },
    );

  if (participantsError) {
    throw participantsError;
  }

  // ==========================================================
  // ROSTERS
  // ==========================================================

  const {
    data: rosters,
    error: rostersError,
  } = await supabase
    .from("user_rosters")
    .select(`
      id,
      profile_id,
      player_id,
      acquisition_price,
      release_clause,
      acquired_at,
      clause_protected_until,
      slot_type,
      is_starter,
      pro_players (
        id,
        nickname,
        full_name,
        role,
        market_value,
        photo_url,
        country_code,
        pro_teams (
          id,
          name,
          tag,
          logo_url,
          region
        )
      )
    `)
    .eq(
      "league_id",
      leagueId,
    )
    .eq(
      "is_active",
      true,
    );

  if (rostersError) {
    throw rostersError;
  }

  // ==========================================================
  // AGRUPAR ROSTERS POR MANAGER
  // ==========================================================

  const rosterMap =
    new Map<
      string,
      any[]
    >();

  for (
    const roster of
      rosters ?? []
  ) {
    if (
      !rosterMap.has(
        roster.profile_id,
      )
    ) {
      rosterMap.set(
        roster.profile_id,
        [],
      );
    }

    if (
      roster.pro_players
    ) {
      rosterMap
        .get(
          roster.profile_id,
        )
        ?.push({
          roster_id:
            roster.id,

          ...roster.pro_players,

          acquisition_price:
            roster.acquisition_price,

          release_clause:
            roster.release_clause,

          acquired_at:
            roster.acquired_at,

          clause_protected_until:
            roster.clause_protected_until,

          slot_type:
            roster.slot_type,

          is_starter:
            roster.is_starter,
        });
    }
  }

  // ==========================================================
  // RESULTADO
  // ==========================================================

  const standings =
    (participants ?? []).map(
      (
        participant: any,
        index,
      ) => ({
        rank:
          index + 1,

        ...participant,

        roster:
          rosterMap.get(
            participant.profile_id,
          ) ?? [],
      }),
    );

  return {
    standings,

    // Lo dejamos temporalmente para no romper
    // componentes antiguos que aún hagan:
    //
    // const { standings, activeLocks } = ...
    //
    // Pero en V1 siempre está vacío.
    activeLocks: [],
  };
}

// ============================================================
// GET LEAGUE GAMEWEEK OVERVIEW
// ============================================================

export async function getLeagueGameweekOverview(
  leagueId: string,
  requestedGameweekId?: number | null,
) {
  const session = await getSession();

  if (!session) {
    throw new Error("Acceso no autorizado");
  }

  const supabase = await createClient();

  // ==========================================================
  // COMPROBAR MEMBRESÍA
  // ==========================================================

  const { data: membership, error: membershipError } =
    await supabase
      .from("league_participants")
      .select("profile_id")
      .eq("league_id", leagueId)
      .eq("profile_id", session.user.id)
      .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("No perteneces a esta liga");
  }

  // ==========================================================
  // JORNADAS
  // ==========================================================

  const { data: gameweeks, error: gameweeksError } =
    await supabase
      .from("gameweeks")
      .select(`
        id,
        name,
        start_date,
        end_date,
        is_active,
        is_locked,
        is_final
      `)
      .order("start_date", {
        ascending: false,
      });

  if (gameweeksError) {
    throw gameweeksError;
  }

  const availableGameweeks =
    gameweeks ?? [];

  /*
   * Prioridad:
   *
   * 1. jornada solicitada
   * 2. jornada activa
   * 3. última jornada disponible
   */
  let selectedGameweek =
    requestedGameweekId
      ? availableGameweeks.find(
          (gw) =>
            gw.id ===
            requestedGameweekId,
        )
      : null;

  if (!selectedGameweek) {
    selectedGameweek =
      availableGameweeks.find(
        (gw) => gw.is_active,
      ) ??
      availableGameweeks[0] ??
      null;
  }

  if (!selectedGameweek) {
    return {
      gameweeks: [],
      selectedGameweek: null,
      standings: [],
    };
  }

  // ==========================================================
  // PARTICIPANTES
  // ==========================================================

  const { data: participants, error: participantsError } =
    await supabase
      .from("league_participants")
      .select(`
        profile_id,
        total_points,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq("league_id", leagueId);

  if (participantsError) {
    throw participantsError;
  }

  // ==========================================================
  // RESULTADOS DE LA JORNADA
  // ==========================================================

  const { data: scores, error: scoresError } =
    await supabase
      .from("participant_scores_history")
      .select(`
        profile_id,
        points_earned,
        rank_in_league,
        rewarded
      `)
      .eq("league_id", leagueId)
      .eq(
        "gameweek_id",
        selectedGameweek.id,
      );

  if (scoresError) {
    throw scoresError;
  }

  const scoreMap = new Map<
    string,
    {
      points_earned: number;
      rank_in_league: number | null;
      rewarded: boolean;
    }
  >();

  for (const score of scores ?? []) {
    scoreMap.set(
      score.profile_id,
      {
        points_earned:
          Number(
            score.points_earned,
          ) || 0,

        rank_in_league:
          score.rank_in_league,

        rewarded:
          score.rewarded,
      },
    );
  }

  // ==========================================================
  // SNAPSHOT DE TITULARES
  // ==========================================================

  const { data: lineups, error: lineupsError } =
    await supabase
      .from("gameweek_lineups")
      .select(`
        id,
        profile_id,
        player_id,
        roster_id,
        captured_at,
        pro_players (
          id,
          nickname,
          full_name,
          role,
          market_value,
          photo_url,
          country_code,
          pro_teams (
            id,
            name,
            tag,
            logo_url,
            region
          )
        )
      `)
      .eq("league_id", leagueId)
      .eq(
        "gameweek_id",
        selectedGameweek.id,
      );

  if (lineupsError) {
    throw lineupsError;
  }

  // ==========================================================
  // PARTIDOS DE LA JORNADA
  // ==========================================================

  const { data: matches, error: matchesError } =
    await supabase
      .from("matches")
      .select("id")
      .eq(
        "gameweek_id",
        selectedGameweek.id,
      );

  if (matchesError) {
    throw matchesError;
  }

  const matchIds =
    (matches ?? []).map(
      (match) => match.id,
    );

  // ==========================================================
  // ACTUACIONES DE JUGADORES
  // ==========================================================

  let performances: Array<{
    player_id: string;
    fantasy_points: number;
  }> = [];

  if (matchIds.length > 0) {
    const {
      data: performanceRows,
      error: performancesError,
    } = await supabase
      .from("player_performances")
      .select(`
        player_id,
        fantasy_points
      `)
      .in(
        "match_id",
        matchIds,
      );

    if (performancesError) {
      throw performancesError;
    }

    performances =
      performanceRows ?? [];
  }

  // ==========================================================
  // SUMAR PUNTOS POR JUGADOR
  // ==========================================================

  const playerPoints =
    new Map<string, number>();

  for (const performance of performances) {
    const current =
      playerPoints.get(
        performance.player_id,
      ) ?? 0;

    playerPoints.set(
      performance.player_id,
      current +
        Number(
          performance.fantasy_points,
        ),
    );
  }

  // ==========================================================
  // AGRUPAR SNAPSHOT POR MANAGER
  // ==========================================================

  const lineupMap =
    new Map<string, any[]>();

  for (const lineup of lineups ?? []) {
    if (
      !lineupMap.has(
        lineup.profile_id,
      )
    ) {
      lineupMap.set(
        lineup.profile_id,
        [],
      );
    }

    if (!lineup.pro_players) {
      continue;
    }

    lineupMap
      .get(
        lineup.profile_id,
      )
      ?.push({
        ...lineup.pro_players,

        roster_id:
          lineup.roster_id,

        captured_at:
          lineup.captured_at,

        gameweek_points:
          playerPoints.get(
            lineup.player_id,
          ) ?? 0,
      });
  }

  // ==========================================================
  // CLASIFICACIÓN DE ESTA JORNADA
  // ==========================================================

  const standings =
    (participants ?? [])
      .map((participant: any) => {
        const score =
          scoreMap.get(
            participant.profile_id,
          );

        return {
          profile_id:
            participant.profile_id,

          profiles:
            participant.profiles,

          total_points:
            Number(
              participant.total_points,
            ) || 0,

          gameweek_points:
            score?.points_earned ??
            0,

          gameweek_rank:
            score?.rank_in_league ??
            null,

          rewarded:
            score?.rewarded ??
            false,

          lineup:
            lineupMap.get(
              participant.profile_id,
            ) ?? [],
        };
      })
      .sort((a, b) => {
        if (
          a.gameweek_rank !== null &&
          b.gameweek_rank !== null
        ) {
          return (
            a.gameweek_rank -
            b.gameweek_rank
          );
        }

        return (
          b.gameweek_points -
          a.gameweek_points
        );
      });

  return {
    gameweeks:
      availableGameweeks,

    selectedGameweek,

    standings,
  };
}