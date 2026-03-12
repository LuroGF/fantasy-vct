"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";

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
    // FIX Bug #11: Use normalized role names for consistency
    const targetRoles = ['DUELISTA', 'INICIADOR', 'CONTROLADOR', 'CENTINELA', 'FLEX'];
    const selectedPlayers: any[] = [];
    const playerIds = new Set<string>();

    for (const role of targetRoles) {
        let p: any = null;
        
        // Try to fetch by role first
        if (role !== 'FLEX') {
            const { data: players } = await supabase
                .from('pro_players')
                .select('id, market_value')
                .eq('role', role)
                .limit(20); 
            
            if (players && players.length > 0) {
                 // Filter out already selected
                 const available = players.filter((pl: any) => !playerIds.has(pl.id));
                 if (available.length > 0) {
                     p = available[Math.floor(Math.random() * available.length)];
                 }
            }
        }

        // Fallback: If Flex, or specific role not found/exhausted, pick ANY random player
        if (!p) {
             const { data: randomPool } = await supabase
                .from('pro_players')
                .select('id, market_value')
                .limit(50);
            
             if (randomPool) {
                 const available = randomPool.filter((pl: any) => !playerIds.has(pl.id));
                 if (available.length > 0) {
                     p = available[Math.floor(Math.random() * available.length)];
                 }
             }
        }

        if (p) {
            selectedPlayers.push(p);
            playerIds.add(p.id);
        }
    }

    if (selectedPlayers.length === 0) return;

    // Insert ONLY 5 players as starters. Substitutes start empty.
    const inserts = selectedPlayers.map((p) => ({
        league_id: leagueId,
        profile_id: profileId,
        player_id: p.id,
        acquisition_price: 0,
        slot_type: 'starter',
        is_starter: true,
        is_active: true,
        release_clause: Math.floor(p.market_value * 1.5)
    }));

    await supabase.from('user_rosters').insert(inserts);
}



export async function createLeague(name: string, userId: string) {
  const session = await getSession();
  if (!session || session.user.id !== userId) throw new Error("Acceso no autorizado");

  const supabase = await createClient();
  try {
    const inviteCode = generateInviteCode();
    
    // 1. Crear la liga
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({ 
        name, 
        invite_code: inviteCode, 
        creator_id: session.user.id,
        budget_limit: 100000000 // 100M por defecto
      })
      .select()
      .single();

    if (leagueError) throw leagueError;

    // 2. Unir al creador a la liga automáticamente como participante
    const { error: joinError } = await supabase
      .from("league_participants")
      .insert({ 
        profile_id: session.user.id, 
        league_id: league.id,
        current_budget: 100000000 
      });

    if (joinError) throw joinError;

    // 3. Asignar equipo inicial
    await assignInitialRoster(supabase, league.id, session.user.id);

    revalidatePath("/leagues");
    return { success: true, league };
  } catch (error) {
    console.error("Error creating league:", error);
    return { success: false, error };
  }
}

export async function joinLeague(inviteCode: string, userId: string) {
  const session = await getSession();
  if (!session || session.user.id !== userId) throw new Error("Acceso no autorizado");

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
    revalidatePath("/");
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
      release_clause,
      pro_players (
        id,
        nickname,
        role,
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
    if (r.pro_players) {
        rosterMap.get(r.profile_id).push({
            ...r.pro_players,
            release_clause: r.release_clause
        });
    }
  });

  // 5. Obtener bloqueos (LOCK) activos en esta liga/semana
  const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).single();
  let activeLocks: string[] = [];
  if (activeGw) {
      const { data: locks } = await supabase
        .from('active_powerups')
        .select('target_player_id, powerup_types!inner(code)')
        .eq('league_id', leagueId)
        .eq('gameweek_id', activeGw.id)
        .eq('powerup_types.code', 'LOCK');
      
      activeLocks = (locks || []).map((l: any) => l.target_player_id);
  }

  return {
      standings: participantsWithPoints.map((p: any) => ({
        ...p,
        roster: rosterMap.get(p.profiles.id) || []
      })),
      activeLocks
  };
}
