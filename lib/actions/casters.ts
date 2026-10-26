"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { V1_FEATURES, V1_PAUSED_FEATURE_MESSAGE } from "@/lib/features";

export async function getCasters() {
  if (!V1_FEATURES.casters) return [];

  const { supabaseAdmin } = await import("@/utils/supabase/admin");
  const { data, error } = await supabaseAdmin
    .from("casters")
    .select("*")
    .order("base_price", { ascending: true });

  if (error) {
    console.error("Error fetching casters:", error);
    return [];
  }
  console.log(`Fetched ${data?.length || 0} casters from DB (Admin Mode)`);
  return data || [];
}

export async function getActiveCasters(leagueId: string, profileId: string, gameweekId: number) {
  if (!V1_FEATURES.casters) return [];

  const { supabaseAdmin } = await import("@/utils/supabase/admin");
  const { data, error } = await supabaseAdmin
    .from("active_casters")
    .select("*, casters(*)")
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)
    .eq("gameweek_id", gameweekId);

  if (error) {
    console.error("Error fetching active casters:", error);
    return [];
  }
  return data || [];
}


export async function hireCaster(leagueId: string, profileId: string, gameweekId: number, casterId: string) {
  const session = await getSession();
  if (!session || session.user.id !== profileId) throw new Error("Acceso no autorizado");
  if (!V1_FEATURES.casters) {
    return { success: false, error: V1_PAUSED_FEATURE_MESSAGE };
  }

  const supabase = await createClient();
  try {
    if (!gameweekId) {
        throw new Error("No hay una jornada activa para contratar analistas en este momento.");
    }

    // 0. Real-time Lock Check (Match Day protection)
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    if (lockStatus.locked) {
        throw new Error(`Contratación bloqueada: ${lockStatus.reason}.`);
    }

    // 1. Check if already has 2 casters for this gameweek
    const { data: existing } = await supabase
      .from("active_casters")
      .select("id, caster_id")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .eq("gameweek_id", gameweekId);

    if (existing && existing.length >= 2) throw new Error("Ya tienes el máximo de 2 analistas contratados para esta jornada.");
    if (existing?.some((e: any) => e.caster_id === casterId)) throw new Error("Ya tienes a este analista contratado.");

    // 2. Get caster price
    const { data: caster } = await supabase
      .from("casters")
      .select("base_price, nickname")
      .eq("id", casterId)
      .single();

    if (!caster) throw new Error("Caster no encontrado.");

    // 3. Check budget
    const { data: participant } = await supabase
      .from("league_participants")
      .select("current_budget")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (!participant || Number(participant.current_budget) < Number(caster.base_price)) {
      throw new Error("Presupuesto insuficiente para contratar a este caster.");
    }

    // 4. Execution
    // a. Subtract budget
    await supabase.from("league_participants")
      .update({ current_budget: Number(participant.current_budget) - Number(caster.base_price) })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    // b. Activate caster
    const { error: activeError } = await supabase
      .from("active_casters")
      .insert({
        league_id: leagueId,
        profile_id: profileId,
        gameweek_id: gameweekId,
        caster_id: casterId
      });

    if (activeError) throw activeError;

    // c. Log transaction
    await supabase.from("market_transactions").insert({
      league_id: leagueId,
      profile_id: profileId,
      type: 'hire_caster', 
      price: caster.base_price
    });

    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
        profile_id: profileId,
        league_id: leagueId,
        title: "🎙️ CONTRATO FIRMADO",
        message: `${caster.nickname} se une a tu mesa de análisis para esta jornada.`,
        type: "system"
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
