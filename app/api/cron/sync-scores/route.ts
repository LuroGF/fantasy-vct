import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";

export async function GET(request: Request) {
  try {
    const now = new Date();
    console.log("Cron: Iniciando sincronización de jornada y puntuaciones...");

    // 1. Obtener la jornada activa
    const { data: activeGw, error: gwError } = await (supabaseAdmin
      .from('gameweeks')
      .select('*')
      .eq('is_active', true) as any)
      .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

    if (gwError) throw gwError;

    if (!activeGw) {
      console.log("Cron: No hay jornada activa. Intentando activar la próxima disponible...");
      const { data: upcoming } = await (supabaseAdmin
        .from('gameweeks')
        .select('*')
        .gte('start_date', now.toISOString())
        .order('start_date', { ascending: true })
        .limit(1) as any)
        .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

      if (upcoming) {
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true }).eq('id', upcoming.id);
          return NextResponse.json({ message: `Jornada ${upcoming.name} activada` });
      }
      return NextResponse.json({ message: "No hay jornadas futuras para activar" });
    }

    // --- A. AUTO-LOCK/UNLOCK DINÁMICO ---
    // El mercado debe estar CERRADO si hay partidos en vivo o falta menos de 1h para el siguiente.
    // El mercado debe estar ABIERTO en caso contrario (permitiendo fichajes entre días).
    
    // Obtenemos todos los partidos de la jornada activa que no han terminado
    const { data: activeMatches } = await (supabaseAdmin
      .from('matches')
      .select('match_date, status')
      .eq('gameweek_id', activeGw.id)
      .neq('status', 'finished') as any);
      
    let shouldLock = false;
    
    if (activeMatches && activeMatches.length > 0) {
      const nowTime = now.getTime();
      
      for (const m of activeMatches) {
        // 1. Si hay partido en juego -> BLOQUEAR
        if (m.status === 'live') {
          shouldLock = true;
          console.log("Cron: Partido en vivo detectado. Mercado debe estar BLOQUEADO.");
          break;
        }
        
        // 2. Si hay partido pendiente que empieza en menos de 1h -> BLOQUEAR
        if (m.status === 'upcoming' && m.match_date) {
            const matchTime = new Date(m.match_date).getTime();
            const timeDiff = matchTime - nowTime;
            
            // Si falta menos de 1 hora (3600000 ms) y es futuro, O si ya pasó la hora pero no está finished (retraso)
            if (timeDiff <= 3600000) { 
                shouldLock = true;
                console.log(`Cron: Partido próximo detectado (${Math.round(timeDiff/60000)} min). Mercado debe estar BLOQUEADO.`);
                break;
            }
        }
      }
    }

    // Aplicar el estado calculado si es diferente al actual
    if (activeGw.is_locked !== shouldLock) {
      console.log(`Cron: Cambiando estado de bloqueo de mercado: ${activeGw.is_locked} -> ${shouldLock}`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: shouldLock }).eq('id', activeGw.id);
      (activeGw as any).is_locked = shouldLock; // Actualizamos la referencia local para el resto del script
    } else {
        console.log(`Cron: Estado de mercado correcto (${shouldLock ? 'BLOQUEADO' : 'ABIERTO'}). No se requieren cambios.`);
    }


    // --- B. VINCULAR PARTIDOS ---
    console.log(`Cron: Vinculando partidos a la jornada ${activeGw.name}...`);
    await (supabaseAdmin
      .from('matches') as any)
      .update({ gameweek_id: activeGw.id })
      .is('gameweek_id', null)
      .gte('match_date', activeGw.start_date)
      .lte('match_date', activeGw.end_date);

    // --- C. SINCRONIZAR ESTADÍSTICAS ---
    const { data: matches, error: matchError } = await (supabaseAdmin
      .from('matches')
      .select(`
        id, 
        vlr_id, 
        status, 
        match_date, 
        team_a_data:pro_teams!team_a(id, name, tag),
        team_b_data:pro_teams!team_b(id, name, tag),
        player_performances(match_id)
      `)
      .eq('gameweek_id', activeGw.id) as any);

    if (matchError) throw matchError;

    // Obtener mapa de jugadores UNA SOLA VEZ para todo el cron
    const { data: playersData } = await supabaseAdmin
      .from('pro_players')
      .select('id, nickname')
      .returns<{ id: string; nickname: string }[]>();
    
    const playerMap = new Map<string, string>();
    playersData?.forEach((p) => {
      playerMap.set(p.nickname.toLowerCase(), p.id);
    });

    for (const match of (matches as any[]) || []) {
      if (!match.vlr_id) continue;
      
      const matchTime = match.match_date ? new Date(match.match_date).getTime() : 0;
      // No intentar scrapear si falta mucho para el partido (a menos que ya esté finished)
      if (now.getTime() < matchTime - (30 * 60 * 1000) && match.status !== 'finished') continue; 

      try {
        const { scrapeMatchDetails, calculateFantasyPoints } = await import('@/lib/vlr');
        const details = await scrapeMatchDetails(match.vlr_id);
        
        if (!details || details.length === 0) {
          console.log(`Cron: Partido ${match.vlr_id} - No se encontraron tablas de estadísticas o están vacías.`);
          continue;
        }

        // Prepare Upserts
        const matchPerformances: any[] = [];

        for (const d of details) {
            let dbPlayerId = playerMap.get(d.nickname.toLowerCase());
            
            if (!dbPlayerId) {
                console.log(`Cron: Creando jugador faltante: ${d.nickname} (${d.teamTag})`);
                
                // Determinar el team_id correcto
                let teamId = null;
                const tag = d.teamTag?.toUpperCase();
                const teamA = (match as any).team_a_data;
                const teamB = (match as any).team_b_data;
                
                const matchTeam = (t: any, queryTag: string) => {
                    if (!t || !queryTag) return false;
                    const name = t.name.toUpperCase();
                    const teamTag = (t.tag || "").toUpperCase();
                    const q = queryTag.toUpperCase();
                    
                    return (
                        q === teamTag || 
                        q === name ||
                        name.includes(q) ||
                        (teamTag && teamTag.includes(q)) ||
                        q.startsWith(teamTag.substring(0, 3)) || // Caso como PCF -> PCIFIC
                        (teamTag && teamTag.startsWith(q))
                    );
                };

                if (matchTeam(teamA, tag)) {
                    teamId = teamA.id;
                } else if (matchTeam(teamB, tag)) {
                    teamId = teamB.id;
                } else {
                    // Si no coincide el tag, intentamos por orden de aparición o default al primer equipo
                    // (En VLR los jugadores suelen estar agrupados por equipo)
                    // Como fallback seguro, si no hay coincidencia, no lo creamos o logueamos
                    console.warn(`Cron: No se pudo determinar el equipo para ${d.nickname} (Tag: ${d.teamTag})`);
                }

                if (teamId) {
                    const { data: newPlayer, error: createError } = await supabaseAdmin
                        .from('pro_players')
                        .insert({
                            nickname: d.nickname,
                            team_id: teamId,
                            role: 'Duelista', // Default role (valid)
                            market_value: 500000, // Default value
                        } as any)
                        .select('id')
                        .single();
                    
                    if (createError) {
                        console.error(`Cron: Error creando jugador ${d.nickname}:`, createError);
                    } else if (newPlayer) {
                        dbPlayerId = (newPlayer as any).id;
                        playerMap.set(d.nickname.toLowerCase(), dbPlayerId!);
                        console.log(`Cron: Jugador ${d.nickname} creado con éxito.`);
                    }
                }
            }

            if (dbPlayerId) {
                matchPerformances.push({
                    match_id: match.id,
                    player_id: dbPlayerId,
                    kills: d.kills,
                    deaths: d.deaths,
                    assists: d.assists,
                    fb: d.fb,
                    fd: d.fd || 0,
                    acs: d.acs || 0,
                    clutches: d.clutches,
                    mvp: false // Default, calculated below
                });
            }
        }
        
        // Calcular MVP (Jugador con mayor ACS en el partido)
        let performanceData = matchPerformances;

        if (performanceData.length > 0) {
            // Encontrar el max ACS
            const maxAcs = Math.max(...performanceData.map(p => p.acs || 0));
            
            // Marcar MVP(s) - por si hay empate
            if (maxAcs > 0) {
                performanceData = performanceData.map(p => ({
                    ...p,
                    mvp: (p.acs || 0) === maxAcs
                }));
            }

            const { error } = await supabaseAdmin
              .from('player_performances')
              .upsert(performanceData as any, { onConflict: 'match_id,player_id' });
          
          if (error) {
            console.error(`Cron: Error guardando stats del partido ${match.vlr_id}:`, error);
          } else {
            // Mark match as finished
            await (supabaseAdmin.from('matches') as any).update({ status: 'finished' }).eq('id', match.id);
            console.log(`Cron: Partido ${match.vlr_id} sincronizado (${performanceData.length} jugadores).`);
          }
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        console.error(`Cron: Error sincronizando partido ${match.vlr_id}:`, err);
      }
    }

    // --- D. CALCULAR PUNTUACIONES ---
    console.log(`Cron: Recalculando puntuaciones de la jornada ${activeGw.id}...`);
    const scoreResult = await calculateGameweekScores(activeGw.id);

    // --- E. AUTO-NEXT JORNADA ---
    const { data: pendingMatches } = await (supabaseAdmin
        .from('matches')
        .select('id')
        .eq('gameweek_id', activeGw.id)
        .neq('status', 'finished') as any);

    if ((pendingMatches as any[])?.length === 0 && now > new Date(activeGw.end_date)) {
        console.log("Cron: Jornada finalizada. Rotando a la siguiente...");
        
        await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false, is_locked: false }).eq('id', activeGw.id);
        
        const { data: nextGw } = await (supabaseAdmin
            .from('gameweeks')
            .select('*')
            .gt('start_date', activeGw.start_date)
            .order('start_date', { ascending: true })
            .limit(1) as any)
            .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };
        
        if (nextGw) {
            await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true, is_locked: false }).eq('id', nextGw.id);
            console.log(`Cron: Siguiente jornada activada: ${nextGw.name}`);
        }
    }

    // --- F. ACTUALIZAR VALORES DE MERCADO ---
    console.log("Cron: Actualizando valores de mercado...");
    const { updateMarketValues } = await import('@/lib/actions/market-dynamics');
    await updateMarketValues();

    return NextResponse.json({
      success: true,
      gameweek: activeGw.name,
      locked: activeGw.is_locked,
      scoringDetails: scoreResult
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
