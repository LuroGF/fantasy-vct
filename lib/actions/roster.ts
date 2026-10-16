"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
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
      error: error?.message || "No se pudo actualizar la alineación.",
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
