"use server";

import { getSession } from "./auth";
import { createClient } from "@/utils/supabase/server";

export type LeagueActivityEvent = {
  id: string;
  leagueId: string;
  eventType: string;
  amount: number | null;
  createdAt: string;
  actor: { id: string; username: string; avatarUrl: string | null } | null;
  target: { id: string; username: string; avatarUrl: string | null } | null;
  player: {
    id: string;
    nickname: string;
    photoUrl: string | null;
    teamTag: string | null;
    teamLogoUrl: string | null;
  } | null;
};

export type ActivityLeague = { id: string; name: string };

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getMyLeagueActivity(
  requestedLeagueId?: string | null,
  requestedLimit = 100,
) {
  const session = await getSession();
  if (!session) {
    return { leagues: [] as ActivityLeague[], activeLeagueId: null, events: [] as LeagueActivityEvent[] };
  }

  const supabase = await createClient();
  const { data: participations, error: participationError } = await supabase
    .from("league_participants")
    .select("league_id, created_at, leagues(id, name)")
    .eq("profile_id", session.user.id)
    .order("created_at", { ascending: true });

  if (participationError) {
    console.error("Error loading activity leagues:", participationError.message);
    return { leagues: [] as ActivityLeague[], activeLeagueId: null, events: [] as LeagueActivityEvent[] };
  }

  const leagues: ActivityLeague[] = (participations ?? []).flatMap((participation) => {
    const league = relationOne(participation.leagues);
    return league ? [{ id: league.id, name: league.name }] : [];
  });
  const activeLeagueId =
    leagues.find((league) => league.id === requestedLeagueId)?.id ?? leagues[0]?.id ?? null;

  if (!activeLeagueId) {
    return { leagues, activeLeagueId: null, events: [] as LeagueActivityEvent[] };
  }

  const limit = Math.min(100, Math.max(1, Math.trunc(requestedLimit)));
  const { data: rows, error: activityError } = await supabase
    .from("league_activity_events")
    .select("id, league_id, event_type, actor_profile_id, target_profile_id, player_id, amount, created_at")
    .eq("league_id", activeLeagueId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (activityError) {
    console.error("Error loading league activity:", activityError.message);
    return { leagues, activeLeagueId, events: [] as LeagueActivityEvent[] };
  }

  const events = rows ?? [];
  const profileIds = Array.from(
    new Set(events.flatMap((event) => [event.actor_profile_id, event.target_profile_id]).filter(Boolean)),
  ) as string[];
  const playerIds = Array.from(new Set(events.map((event) => event.player_id).filter(Boolean))) as string[];

  const [profilesResult, playersResult] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, username, avatar_url").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    playerIds.length
      ? supabase
          .from("pro_players")
          .select("id, nickname, photo_url, pro_teams(tag, logo_url)")
          .in("id", playerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const playerMap = new Map((playersResult.data ?? []).map((player) => [player.id, player]));

  const hydrated: LeagueActivityEvent[] = events.map((event) => {
    const actor = event.actor_profile_id ? profileMap.get(event.actor_profile_id) : null;
    const target = event.target_profile_id ? profileMap.get(event.target_profile_id) : null;
    const player = event.player_id ? playerMap.get(event.player_id) : null;
    const team = relationOne(player?.pro_teams);

    return {
      id: event.id,
      leagueId: event.league_id,
      eventType: event.event_type,
      amount: event.amount === null ? null : Number(event.amount),
      createdAt: event.created_at,
      actor: actor
        ? { id: actor.id, username: actor.username, avatarUrl: actor.avatar_url }
        : null,
      target: target
        ? { id: target.id, username: target.username, avatarUrl: target.avatar_url }
        : null,
      player: player
        ? {
            id: player.id,
            nickname: player.nickname,
            photoUrl: player.photo_url,
            teamTag: team?.tag ?? null,
            teamLogoUrl: team?.logo_url ?? null,
          }
        : null,
    };
  });

  return { leagues, activeLeagueId, events: hydrated };
}
