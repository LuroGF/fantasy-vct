"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Función para generar un código de invitación aleatorio
function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getGlobalRank(userId: string) {
  const supabase = await createClient();
  
  // 1. Get user points
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("global_points")
    .eq("id", userId)
    .single();
  
  if (!userProfile) return 0;
  
  // 2. Count users with more points
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .gt("global_points", userProfile.global_points);
  
  return (count || 0) + 1;
}

async function assignInitialRoster(supabase: any, leagueId: string, profileId: string) {
    // 1. Get 1 random player of each role
    const roles = ['Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex'];
    const initialPlayers = [];

    for (const role of roles) {
        const { data: player } = await supabase
            .from('pro_players')
            .select('id, market_value')
            .eq('role', role)
            .limit(10); // Get a pool
        
        if (player && player.length > 0) {
            const randomPlayer = player[Math.floor(Math.random() * player.length)];
            initialPlayers.push(randomPlayer);
        }
    }

    if (initialPlayers.length === 0) return;

    // 2. Insert into roster
    const inserts = initialPlayers.map((p, i) => ({
        league_id: leagueId,
        profile_id: profileId,
        player_id: p.id,
        acquisition_price: 0, // Free starter team
        slot_type: i === 0 ? 'starter' : (i < 5 ? 'starter' : 'substitute'), // Distribute
        is_starter: i < 5, 
        release_clause: Math.floor(p.market_value * 1.5)
    }));

    // For simplicity, let's just make the first 5 starters (1 of each role)
    const balancedInserts = initialPlayers.slice(0, 5).map((p) => ({
        league_id: leagueId,
        profile_id: profileId,
        player_id: p.id,
        acquisition_price: 0,
        slot_type: 'starter',
        is_starter: true,
        release_clause: Math.floor(p.market_value * 1.5)
    }));

    await supabase.from('user_rosters').insert(balancedInserts);
}

export async function createLeague(name: string, userId: string) {
  const supabase = await createClient();
  try {
    const inviteCode = generateInviteCode();
    
    // 1. Crear la liga
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({ 
        name, 
        invite_code: inviteCode, 
        creator_id: userId,
        budget_limit: 100000000 // 100M por defecto
      })
      .select()
      .single();

    if (leagueError) throw leagueError;

    // 2. Unir al creador a la liga automáticamente como participante
    const { error: joinError } = await supabase
      .from("league_participants")
      .insert({ 
        profile_id: userId, 
        league_id: league.id,
        current_budget: 100000000 
      });

    if (joinError) throw joinError;

    // 3. Asignar equipo inicial
    await assignInitialRoster(supabase, league.id, userId);

    revalidatePath("/leagues");
    return { success: true, league };
  } catch (error) {
    console.error("Error creating league:", error);
    return { success: false, error };
  }
}

export async function joinLeague(inviteCode: string, userId: string) {
  const supabase = await createClient();
  try {
    // 1. Buscar la liga por código
    const { data: league, error: findError } = await supabase
      .from("leagues")
      .select("id, budget_limit")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (findError) throw new Error("Código de invitación no válido");

    // 2. Cálculo de presupuesto inicial (Late Joiner adjustment)
    // Buscamos el presupuesto medio de la liga para no entrar en desventaja
    const { data: others } = await supabase
        .from('league_participants')
        .select('current_budget')
        .eq('league_id', league.id);
    
    let startingBudget = league.budget_limit;
    if (others && others.length > 0) {
        const avg = others.reduce((acc: number, curr: any) => acc + Number(curr.current_budget), 0) / others.length;
        // Si la media es significativamente mayor (inflación), ajustamos. 
        // Pero el usuario dijo "menos dinero", así que quizá quiere que empiecen con lo mismo? 
        // "separarlo la primera jornada" implica aislamiento de puntos.
        // Vamos a mantener el budget pero marcarlo como 'new_joiner' si hay jornada activa.
    }

    // 3. Unirse a la liga
    const { error: joinError } = await supabase
      .from("league_participants")
      .insert({ 
        profile_id: userId, 
        league_id: league.id,
        current_budget: startingBudget 
      });

    if (joinError) {
       if (joinError.code === "23505") throw new Error("Ya perteneces a esta liga");
       throw joinError;
    }

    // 4. Asignar equipo inicial
    await assignInitialRoster(supabase, league.id, userId);

    revalidatePath("/leagues");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al unirse a la liga";
    return { success: false, error: message };
  }
}

export async function getUserLeagues(userId: string) {

  const supabase = await createClient();
  
  // 1. Obtener las ligas del usuario
  const { data: participations, error } = await supabase
    .from("league_participants")
    .select(`
      current_budget,
      transfers_made_this_week,
      total_points,
      league_id,
      leagues (
        id,
        name,
        invite_code
      )
    `)
    .eq("profile_id", userId);

  if (error) {
    console.error("Error fetching leagues:", error);
    return [];
  }

  return participations;
}

export async function getLeagueClassification(leagueId: string) {
  const supabase = await createClient();
  
  // 1. Obtener participantes con puntos directamente de league_participants
  const { data: participants, error: pError } = await supabase
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
    .eq("league_id", leagueId)
    .order('total_points', { ascending: false });

  if (pError) throw pError;

  const participantsWithPoints = participants;

  // 4. Obtener rosters de todos los participantes de esta liga (solo activos)
  const { data: rosters, error: rError } = await supabase
    .from("user_rosters")
    .select(`
      profile_id,
      player_id,
      pro_players (
        id,
        nickname,
        pro_teams (tag)
      )
    `)
    .eq("league_id", leagueId)
    .eq("is_active", true);

  if (rError) throw rError;

  // Agrupar rosters por profile_id
  const rosterMap = new Map();
  rosters.forEach((r: any) => {
    if (!rosterMap.has(r.profile_id)) rosterMap.set(r.profile_id, []);
    rosterMap.get(r.profile_id).push(r.pro_players);
  });

  return participantsWithPoints.map((p: any) => ({
    ...p,
    roster: rosterMap.get(p.profiles.id) || []
  }));
}
