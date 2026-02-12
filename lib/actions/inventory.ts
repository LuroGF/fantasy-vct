"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPowerUpTypes() {
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
  const supabase = await createClient();
  try {
    // 1. Get Powerup details
    const { data: item, error: iError } = await supabase
      .from("powerup_types")
      .select("*")
      .eq("code", powerUpCode)
      .single();
    
    if (iError || !item) throw new Error("Artículo no encontrado");

    // 2. Check Points Balance
    const { data: participant, error: pError } = await supabase
      .from("league_participants")
      .select("total_points")
      .eq("league_id", leagueId)
      .eq("profile_id", profileId)
      .single();

    if (pError || !participant) throw new Error("Error verificando puntos");
    
    const currentPoints = Number(participant.total_points || 0);
    const price = Number(item.base_price);

    if (currentPoints < price) {
      throw new Error(`Puntos insuficientes (Tienes ${currentPoints}, necesitas ${price})`);
    }

    // 3. Process Purchase (Transaction)
    
    // A. Deduct Points
    const { error: bError } = await supabase
      .from("league_participants")
      .update({ total_points: currentPoints - price })
      .eq("league_id", leagueId)
      .eq("profile_id", profileId);

    if (bError) throw bError;

    // B. Add to Inventory (Upsert)
    // First check logic ( upsert might be tricky with unique constraints involving league/profile/type)
    // We already defined unique constraint in DB migration.
    
    // We need to fetch existing to increment or handle upsert manually or use upsert
    // Let's use upsert with onConflict. But we need current quantity.
    // Easier to select then insert/update.
    
    const { data: existing } = await supabase
        .from("user_inventory")
        .select("id, quantity")
        .eq("league_id", leagueId)
        .eq("profile_id", profileId)
        .eq("powerup_type_id", item.id)
        .single();
    
    if (existing) {
        await supabase
          .from("user_inventory")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
    } else {
        await supabase
          .from("user_inventory")
          .insert({
              league_id: leagueId,
              profile_id: profileId,
              powerup_type_id: item.id,
              quantity: 1
          });
    }

    // C. Record Market Transaction (Optional but good for history)
    await supabase.from("market_transactions")
       .insert({
           league_id: leagueId,
           profile_id: profileId,
           type: 'buy_item', // Need to make sure this fits DB constraints if any
           price: item.base_price,
           player_id: null // Items are not player specific transactions usually
       });

    revalidatePath("/shop");
    revalidatePath("/market");
    revalidatePath("/team");
    
    return { success: true, message: `Compra exitosa: ${item.name}` };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en la compra";
    return { success: false, error: message };
  }
}

export async function activatePowerUp(leagueId: string, profileId: string, powerUpTypeId: string, targetPlayerId?: string) {
    const supabase = await createClient();
    try {
        // 1. Get active gameweek info
        const { data: activeGw } = await supabase
            .from('gameweeks')
            .select('id, is_locked')
            .eq('is_active', true)
            .single();

        if (!activeGw) throw new Error("No hay jornada activa");
        if (activeGw.is_locked) throw new Error("No se pueden usar cartas durante la jornada (mercado cerrado)");

        // 2. CHECK RESTRICTION: One powerup per gameweek per user
        const { count } = await supabase
            .from('active_powerups')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', leagueId)
            .eq('profile_id', profileId)
            .eq('gameweek_id', activeGw.id);

        if (count && count > 0) {
            throw new Error("Límite alcanzado: Solo puedes usar 1 carta por jornada.");
        }

        // 3. Verify Inventory
        const { data: inventoryItem } = await supabase
            .from("user_inventory")
            .select("*")
            .eq("league_id", leagueId)
            .eq("profile_id", profileId)
            .eq("powerup_type_id", powerUpTypeId)
            .gt("quantity", 0)
            .single();

        if (!inventoryItem) throw new Error("No tienes esta carta en tu inventario");

        // 4. Get PowerUp Type Info (to know logic LOCK/MONEY etc)
        const { data: typeInfo } = await supabase
            .from("powerup_types")
            .select("code")
            .eq("id", powerUpTypeId)
            .single();

        if (!typeInfo) throw new Error("Tipo de carta inválido");

        // 5. Apply Effect Logic
        if (typeInfo.code === 'MONEY') {
            const CASH_BONUS = 5000000;
             // Add money
            const { data: participant } = await supabase
                .from("league_participants")
                .select("current_budget")
                .eq("league_id", leagueId)
                .eq("profile_id", profileId)
                .single();
            
            if (participant) {
                await supabase
                    .from("league_participants")
                    .update({ current_budget: Number(participant.current_budget) + CASH_BONUS })
                    .eq("league_id", leagueId)
                    .eq("profile_id", profileId);
            }
        } 
        else if (typeInfo.code === 'LOCK') {
            if (!targetPlayerId) throw new Error("Se requiere seleccionar un jugador para usar el Candado");
            // Check ownership
            const { data: ownership } = await supabase
                .from("user_rosters")
                .select("id")
                .eq("league_id", leagueId)
                .eq("profile_id", profileId)
                .eq("player_id", targetPlayerId)
                .single();
            if (!ownership) throw new Error("Solo puedes blindar a jugadores de tu equipo");
        }
        else if (typeInfo.code === 'CAPTAIN') {
            if (!targetPlayerId) throw new Error("Se requiere seleccionar un jugador para Capitán");
             // Check ownership
             const { data: ownership } = await supabase
             .from("user_rosters")
             .select("id")
             .eq("league_id", leagueId)
             .eq("profile_id", profileId)
             .eq("player_id", targetPlayerId)
             .single();
            if (!ownership) throw new Error("Solo puedes nombrar capitán a jugadores de tu equipo");
        }

        // 6. Consume Item (Decrement quantity)
        await supabase
            .from("user_inventory")
            .update({ quantity: inventoryItem.quantity - 1 })
            .eq("id", inventoryItem.id);

        // 7. Register Active Powerup
        await supabase
            .from("active_powerups")
            .insert({
                league_id: leagueId,
                profile_id: profileId,
                gameweek_id: activeGw.id,
                powerup_type_id: powerUpTypeId,
                target_player_id: targetPlayerId || null
            });

        revalidatePath("/team");
        return { success: true, message: "Carta activada correctamente" };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error al activar carta";
        return { success: false, error: message };
    }
}
