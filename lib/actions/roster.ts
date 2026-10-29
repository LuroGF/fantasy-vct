"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";

export type LineupWindowStatus = {
  state: "preseason" | "open" | "locked";
  locked: boolean;
  gameweek: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
};

export async function getLineupWindowStatus(): Promise<LineupWindowStatus> {
  const session = await getSession();
  if (!session) throw new Error("Acceso no autorizado");

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: activeGameweek, error: activeError } = await supabase
    .from("gameweeks")
    .select("id, name, start_date, end_date, is_locked")
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) throw activeError;

  const currentGameweek = activeGameweek
    ? activeGameweek
    : (
        await supabase
          .from("gameweeks")
          .select("id, name, start_date, end_date, is_locked")
          .lte("start_date", now)
          .gte("end_date", now)
          .order("start_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;

  if (currentGameweek) {
    const locked =
      Boolean(currentGameweek.is_locked) ||
      Date.now() >= new Date(currentGameweek.start_date).getTime();

    return {
      state: locked ? "locked" : "open",
      locked,
      gameweek: currentGameweek,
    };
  }

  const { data: nextGameweek, error: nextError } = await supabase
    .from("gameweeks")
    .select("id, name, start_date, end_date")
    .gt("start_date", now)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextError) throw nextError;

  return {
    state: "preseason",
    locked: false,
    gameweek: nextGameweek ?? null,
  };
}

export async function setStarterStatus(
  leagueId: string,
  profileId: string,
  playerId: string,
  newSlot: "starter" | "bench",
) {
  const session = await getSession();

  if (!session || session.user.id !== profileId) {
    throw new Error("Acceso no autorizado");
  }

  const supabase = await createClient();

  try {
    const { data: result, error: rpcError } = await supabase.rpc(
      "handle_set_starter_status",
      {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_player_id: playerId,
        p_new_slot: newSlot,
      },
    );

    if (rpcError) {
      console.error("handle_set_starter_status RPC error:", rpcError);

      throw new Error(
        rpcError.message || "No se pudo actualizar la alineación.",
      );
    }

    if (!result || result.success !== true) {
      throw new Error(
        result?.message || "No se pudo actualizar la alineación.",
      );
    }

    revalidatePath("/team");

    return {
      success: true,
      message:
        newSlot === "starter"
          ? "Jugador ascendido a titular."
          : "Jugador movido al banquillo.",
    };
  } catch (error: any) {
    console.error("Roster Change Error:", error);

    return {
      success: false,
      error: "No se pudo actualizar la alineación. Inténtalo de nuevo.",
    };
  }
}

export async function getUserFullRoster(leagueId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_rosters")
    .select(
      `
      id,
      player_id,
      acquisition_price,
      release_clause,
      is_active,
      is_starter,
      slot_type,
      pro_players (
        id,
        nickname,
        role,
        market_value,
        photo_url,
        team_id,
        pro_teams (
          tag,
          name,
          logo_url
        )
      )
    `,
    )
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .order("slot_type", { ascending: true }); // Starter usually first

  if (error) {
    console.error("Error fetching roster:", error);
    return [];
  }
  return data;
}
