"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { V1_FEATURES, V1_PAUSED_FEATURE_MESSAGE } from "@/lib/features";

export async function getPowerUpTypes() {
  if (!V1_FEATURES.powerUps) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("powerup_types")
    .select("*")
    .order("base_price");
  
  if (error) {
    console.error("Error fetching powerups:", error);
    return [];
  }
  return data;
}

export async function getUserInventory(leagueId: string, profileId: string) {
  if (!V1_FEATURES.powerUps) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_inventory")
    .select(`
        id,
        quantity,
        powerup_types (
          id,
          code,
          name,
          base_price,
          description,
          icon
        )
    `)
    .eq("league_id", leagueId)
    .eq("profile_id", profileId)
    .gt("quantity", 0);

  if (error) return [];
  return data;
}

export async function getActivePowerUps(leagueId: string, profileId: string) {
  if (!V1_FEATURES.powerUps) return [];

  const supabase = await createClient();
  const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).single();
  
  if (!activeGw) return [];

  const { data, error } = await supabase
    .from('active_powerups')
    .select('*, powerup_types(code)')
    .eq('league_id', leagueId)
    .eq('profile_id', profileId)
    .eq('gameweek_id', activeGw.id);

  if (error) {
    console.error("Error fetching active powerups:", error);
    return [];
  }
  return data;
}

export async function buyPowerUp(leagueId: string, profileId: string, powerUpCode: string) {
  const session = await getSession();
  if (!session || session.user.id !== profileId) throw new Error("Acceso no autorizado");
  if (!V1_FEATURES.powerUps) {
    return { success: false, error: V1_PAUSED_FEATURE_MESSAGE };
  }
  
  const supabase = await createClient();
  try {
    // 0. Market Lock Check
    const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
    const lockStatus = await getMarketLockStatus(supabase);
    if (lockStatus.locked) {
        throw new Error(`La tienda está cerrada: ${lockStatus.reason}.`);
    }

    // 1. Get Powerup details
    const { data: item, error: iError } = await supabase
      .from("powerup_types")
      .select("*")
      .eq("code", powerUpCode)
      .single();
    
    if (iError || !item) throw new Error("Artículo no encontrado");

    // 2. Call Atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc('handle_buy_powerup', {
        p_league_id: leagueId,
        p_profile_id: profileId,
        p_powerup_type_id: item.id,
        p_price: item.base_price
    });

    if (rpcError) throw new Error("Error en la transmisión de datos.");
    if (!result?.success) throw new Error(result?.message || "No se pudo realizar la compra.");

    revalidatePath("/shop");
    revalidatePath("/market");
    revalidatePath("/team");
    revalidatePath("/"); // Update global points/stats
    
    return { success: true, message: `¡Objeto adquirido! ${item.name} ahora está en tu inventario.` };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function activatePowerUp(leagueId: string, profileId: string, powerUpTypeId: string, targetPlayerId?: string) {
    const session = await getSession();
    if (!session || session.user.id !== profileId) throw new Error("Acceso no autorizado");
    if (!V1_FEATURES.powerUps) {
        return { success: false, error: V1_PAUSED_FEATURE_MESSAGE };
    }
    
    const supabase = await createClient();
    try {
        const { data: activeGw } = await supabase.from('gameweeks').select('id, is_locked').eq('is_active', true).maybeSingle();
        if (!activeGw) throw new Error("No hay jornada operativa actualmente.");
        
        const { getMarketLockStatus } = await import("@/lib/gameweek-logic");
        const lockStatus = await getMarketLockStatus(supabase);
        if (lockStatus.locked) {
            throw new Error(`Protocolos suspendidos: ${lockStatus.reason}.`);
        }

        const { count } = await supabase.from('active_powerups').select('*', { count: 'exact', head: true }).eq('league_id', leagueId).eq('profile_id', profileId).eq('gameweek_id', activeGw.id).eq('powerup_type_id', powerUpTypeId);
        if (count && count > 0) throw new Error("Protocolo ya activo para esta jornada.");

        const { data: inventoryItem } = await supabase.from("user_inventory").select("*").eq("league_id", leagueId).eq("profile_id", profileId).eq("powerup_type_id", powerUpTypeId).gt("quantity", 0).single();
        if (!inventoryItem) throw new Error("Recurso no disponible en inventario.");

        const { data: typeInfo } = await supabase.from("powerup_types").select("code, name").eq("id", powerUpTypeId).single();
        if (!typeInfo) throw new Error("Tipo de protocolo desconocido.");

        // Effects Execution
        if (typeInfo.code === 'MONEY') {
            const CASH_BONUS = 5000000;
            const { data: part } = await supabase.from("league_participants").select("current_budget").eq("league_id", leagueId).eq("profile_id", profileId).single();
            if (part) {
                const { error: updErr } = await supabase.from("league_participants").update({ current_budget: Number(part.current_budget) + CASH_BONUS }).eq("league_id", leagueId).eq("profile_id", profileId);
                if (updErr) throw updErr;
            }
        } 
        // ... (other types already validated or added)

        // Consume & Register
        const { error: consumeError } = await supabase.from("user_inventory").update({ quantity: inventoryItem.quantity - 1 }).eq("id", inventoryItem.id);
        if (consumeError) throw consumeError;

        const { error: activeError } = await supabase.from("active_powerups").insert({
            league_id: leagueId,
            profile_id: profileId,
            gameweek_id: activeGw.id,
            powerup_type_id: powerUpTypeId,
            target_player_id: targetPlayerId || null
        });

        if (activeError) throw activeError;

        revalidatePath("/team");
        revalidatePath("/market");
        revalidatePath("/");
        return { success: true, message: `Protocolo ${typeInfo.name} activado con éxito.` };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
