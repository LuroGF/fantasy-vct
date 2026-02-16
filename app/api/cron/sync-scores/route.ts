import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { supabaseAdmin } from "@/utils/supabase/admin";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";
import { fetchVlrMatches } from "@/lib/vlr";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    // Force Madrid Time for reference
    const madridTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    const madridHour = madridTime.getHours();
    
    console.log(`Cron: Sync Start. Madrid Time: ${madridTime.toISOString()} (${madridHour}h)`);

    // 0. SCRAPE & SYNC MATCHES (Ensure DB is up to date)
    // This adds new matches and updates dates
    try {
        console.log("Cron: Actualizando lista de partidos desde VLR...");
        await fetchVlrMatches();
    } catch (e) {
        console.error("Cron: Error scraping matches:", e);
        // Continue execution, we can still process existing matches
    }

    // 1. Obtener jornada activa
    const { data: activeGw, error: gwError } = await (supabaseAdmin
      .from('gameweeks')
      .select('*')
      .eq('is_active', true) as any)
      .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

    if (gwError) throw gwError;

    let currentGw: Database['public']['Tables']['gameweeks']['Row'] | null = activeGw;

    // --- CHECK IF ACTIVE GW SHOULD BE CLOSED ---
    if (activeGw && activeGw.end_date) {
        const endDate = new Date(activeGw.end_date);
        // If the active GW end date is in the past, finalize and deactivate
        if (now.getTime() > endDate.getTime() + 3600000) { // Give 1h margin
            console.log(`Cron: Finalizando Jornada ${activeGw.name} (ID: ${activeGw.id}) por fecha de fin alcanzada.`);
            
            // 1. Finalize scores (reward budget)
            await calculateGameweekScores(activeGw.id, true);
            
            // 2. Deactivate
            await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false }).eq('id', activeGw.id);
            
            currentGw = null; // Look for the new one below
        }
    }

    if (!currentGw) {
      console.log(`Cron: No hay jornada activa (o se acaba de cerrar). Buscando para la fecha actual: ${now.toISOString()}`);
      
      const { data: currentOrUpcoming, error: searchError } = await (supabaseAdmin
        .from('gameweeks')
        .select('*')
        .lte('start_date', now.toISOString())
        .gte('end_date', now.toISOString())
        .limit(1) as any)
        .maybeSingle();

      if (searchError) console.error("Cron: Error buscando jornada actual:", searchError);
      
      currentGw = currentOrUpcoming;

      if (!currentGw) {
        console.log("Cron: No se encontró jornada para hoy (lunes?). Buscando la próxima futura...");
        const { data: nextStart } = await (supabaseAdmin
          .from('gameweeks')
          .select('*')
          .gt('start_date', now.toISOString())
          .order('start_date', { ascending: true })
          .limit(1) as any)
          .maybeSingle();
        currentGw = nextStart;
      }

      if (currentGw) {
          console.log(`Cron: Activando Jornada: ${currentGw.name} (ID: ${currentGw.id})`);
          // Deactivate ANY other just in case
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false }).neq('id', currentGw.id);
          // Activate this one
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true }).eq('id', currentGw.id);
          
          // Reset weekly transfer counter and current week points for all participants
          console.log(`Cron: Nueva jornada detectada. Reseteando contadores de transferencias...`);
          await supabaseAdmin.from('league_participants').update({ 
              transfers_made_this_week: 0
          } as any);
          
          currentGw.is_active = true;
      } else {
         console.log("Cron: No hay ninguna jornada registrada en la BBDD.");
         return NextResponse.json({ message: "No hay jornadas registradas" });
      }
    }
    
    // De aquí en adelante usamos currentGw
    const activeGwId = currentGw.id;
    console.log(`Cron: Procesando Jornada Activa ID: ${activeGwId} (${currentGw.name})`);
    
    // 1. Obtener partidos de la jornada
    const { data: gwMatches, error: matchesError } = await (supabaseAdmin
      .from('matches')
      .select('match_date, status, vlr_id')
      .eq('gameweek_id', activeGwId) as any);

    if (matchesError) console.error("Cron: Error cargando partidos de la jornada:", matchesError);
      
    let shouldLock = false; 
    
    // --- WEEKLY CYCLE: LOCK ON TUE-THU (MADRID TIME) ---
    const dayOfWeek = madridTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Core competition days are Tuesday, Wednesday, Thursday
    const isCoreMatchDays = (dayOfWeek >= 2 && dayOfWeek <= 4); 
    
    if (isCoreMatchDays) {
        shouldLock = true;
    }

    // --- DYNAMIC LOCK (5h before ANY match start) ---
    if (gwMatches && gwMatches.length > 0) {
        const nowMs = now.getTime();
        const hasLive = gwMatches.some((m: any) => m.status === 'live');
        
        // Lock if any match starts in less than 5 hours (18,000,000 ms) OR if match is already live
        const startsSoon = gwMatches.some((m: any) => {
            if (m.status !== 'upcoming' || !m.match_date) return false;
            const startTime = new Date(m.match_date).getTime();
            const hoursDiff = (startTime - nowMs) / 3600000;
            return startTime > nowMs && hoursDiff < 5;
        });

        if (hasLive || startsSoon) {
            shouldLock = true;
            if (startsSoon && !isCoreMatchDays) {
                 console.log(`Cron: Bloqueo dinámico activado (Partido detectado en <5h)`);
            }
        }
    }

    // --- LATE MONDAY LOCK ---
    // If it's Monday after 23:59, we lock for Tuesday prep
    if (dayOfWeek === 1 && madridHour >= 23 && madridTime.getMinutes() >= 55) {
        shouldLock = true;
    }

    if (currentGw.is_locked !== shouldLock) {
      console.log(`Cron: Transición de Bloqueo: ${currentGw.is_locked ? "CERRADO" : "ABIERTO"} -> ${shouldLock ? "CERRADO" : "ABIERTO"}`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: shouldLock }).eq('id', currentGw.id);
      (currentGw as any).is_locked = shouldLock;
    }

    // --- B. VINCULAR PARTIDOS ---
    await (supabaseAdmin
      .from('matches') as any)
      .update({ gameweek_id: currentGw.id })
      .is('gameweek_id', null)
      .gte('match_date', currentGw.start_date)
      .lte('match_date', currentGw.end_date);

    // --- C. SYNC SCORES (PROCESS LIVE MATCHES) ---
    // --- C. SYNC SCORES (PROCESS LIVE MATCHES) ---
    // Let's refetch matches to include finished ones to check for stats

     const { data: allGwMatches } = await (supabaseAdmin
      .from('matches')
      .select(`
        id, vlr_id, status, match_date, 
        team_a_data:pro_teams!team_a(id, name, tag),
        team_b_data:pro_teams!team_b(id, name, tag),
        player_performances(match_id)
      `)
      .eq('gameweek_id', currentGw.id) as any);

    const matchToSync = (allGwMatches as any[])?.filter(m => {
        const mTime = m.match_date ? new Date(m.match_date).getTime() : 0;
        const isPast = mTime > 0 && now.getTime() > mTime;

        // If live, sync
        if (m.status === 'live') return true;
        
        // If upcoming but it's in the past (> 30m ago), it definitely should have finished or be live
        if (m.status === 'upcoming' && isPast && now.getTime() > mTime + 1800000) return true;

        // If upcoming and close (< 30m), sync (maybe lineups?)
        if (m.status === 'upcoming' && now.getTime() > mTime - 1800000 && now.getTime() < mTime + 7200000) return true;

        // If finished but no stats, sync
        if (m.status === 'finished' && (!m.player_performances || m.player_performances.length === 0)) return true;
        
        return false;
    }) || [];

    // Player Map Cache
    const { data: playersData } = await supabaseAdmin.from('pro_players').select('id, nickname').returns<{ id: string; nickname: string }[]>();
    const playerMap = new Map();
    playersData?.forEach((p) => playerMap.set(p.nickname.toLowerCase(), p.id));

    const { scrapeMatchDetails } = await import('@/lib/vlr');

    for (const match of matchToSync) {
      if (!match.vlr_id) continue;
      
      try {
        const result = await scrapeMatchDetails(match.vlr_id);
        
        if (!result) continue;
        const { stats: details, status: currentStatus } = result;

        // Update status if it changed (especially for past upcoming matches)
        if (currentStatus && match.status !== currentStatus) {
            console.log(`Cron: Updating match ${match.vlr_id} status: ${match.status} -> ${currentStatus}`);
            await (supabaseAdmin.from('matches') as any).update({ status: currentStatus }).eq('id', match.id);
            match.status = currentStatus;
        }

        if (!details || details.length === 0) continue;

        const performaceUpserts = [];
        
        for (const d of details) {
            let dbPlayerId = playerMap.get(d.nickname.toLowerCase());
            // ... (rest of player creation logic)
            if (!dbPlayerId) {
                 let teamId = null;
                 const tag = d.teamTag?.toUpperCase();
                 const teamA = (match as any).team_a_data;
                 const teamB = (match as any).team_b_data;
                 
                  const matchTeam = (t: any, queryTag: string) => {
                    if (!t || !queryTag) return false;
                    const name = t.name.toUpperCase();
                    const teamTag = (t.tag || "").toUpperCase();
                    const q = queryTag.toUpperCase();
                    return (q === teamTag || q === name || name.includes(q) || (teamTag && teamTag.includes(q)));
                  };

                 if (matchTeam(teamA, tag)) teamId = teamA.id;
                 else if (matchTeam(teamB, tag)) teamId = teamB.id;
                 
                 if (teamId) {
                     const { data: newP } = await supabaseAdmin.from('pro_players').insert({
                         nickname: d.nickname, team_id: teamId, role: 'Flex', market_value: 5000000 
                     } as any).select().single();

                     if (newP) {
                         dbPlayerId = (newP as any).id;
                         playerMap.set(d.nickname.toLowerCase(), dbPlayerId);
                     }
                 }
            }

            if (dbPlayerId) {
                performaceUpserts.push({
                    match_id: match.id,
                    player_id: dbPlayerId,
                    map_name: d.map_name,
                    kills: d.kills, deaths: d.deaths, assists: d.assists,
                    fb: d.fb, fd: d.fd || 0, acs: d.acs || 0, clutches: d.clutches,
                    agent_name: d.agent_name,
                    agent_role: d.agent_role,
                    mvp: false
                });
            }
        }

        if (performaceUpserts.length > 0) {
            const maxAcs = Math.max(...performaceUpserts.map(p => p.acs));
            const finalData = performaceUpserts.map(p => ({ ...p, mvp: p.acs === maxAcs }));
            
            await supabaseAdmin.from('player_performances').upsert(finalData as any, { onConflict: 'match_id,player_id,map_name' });
            
            // Re-ensure finish status if we have stats
            if (match.status !== 'finished' && currentStatus !== 'live') {
                await (supabaseAdmin.from('matches') as any).update({ status: 'finished' }).eq('id', match.id);
            }
            console.log(`Cron: Stats saved for ${match.vlr_id}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
          console.error(`Error syncing match ${match.vlr_id}`, e);
      }
    }

    // --- D. CALCULAR PUNTUACIONES (Live Update) ---
    const scoreResult = await calculateGameweekScores(currentGw.id, false);

    // --- E. AUTO-NEXT (Check for completion) ---
    const { data: pendingMatches } = await (supabaseAdmin
        .from('matches')
        .select('id')
        .eq('gameweek_id', currentGw.id)
        .neq('status', 'finished') as any);

    const allFinished = (pendingMatches as any[])?.length === 0;
    
    // Condition to close: All matches finished AND it's at least the end_date of the GW
    // Use madridTime to ensure we don't close too early on Sunday
    const gwEndDate = new Date(currentGw.end_date);
    
    if (allFinished && madridTime >= gwEndDate) {
         console.log(`Cron: Finalizando Jornada ${currentGw.name}. Repartiendo recompensas finales...`);
         
         // FINAL SCORE RUN (With Rewards & Budget Bonuses!)
         await calculateGameweekScores(currentGw.id, true);

         // Deactivate current GW
         await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false, is_locked: false }).eq('id', currentGw.id);
         
         // Find and Activate next gameweek
         const { data: nextGw } = await (supabaseAdmin
            .from('gameweeks')
            .select('*')
            .gt('start_date', currentGw.start_date)
            .order('start_date', { ascending: true })
            .limit(1) as any).maybeSingle();
            
         if (nextGw) {
             console.log(`Cron: Configurando nueva jornada principal: ${nextGw.name}`);
             await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true, is_locked: false }).eq('id', nextGw.id);
             
             // Reset weekly transfer counter for the new week
             await supabaseAdmin.from('league_participants').update({ transfers_made_this_week: 0 } as any);
         }
    }

    // --- F. MERCADO ---
    const { updateMarketValues } = await import('@/lib/actions/market-dynamics');
    const { resolveExpiredAuctions } = await import('@/lib/actions/market');
    
    // Solo actualizar valores de mercado una vez al día (4 AM Madrid)
    if (madridHour === 4) {
        console.log("Cron: Ejecutando actualización diaria de valores de mercado...");
        await updateMarketValues();
    }
    
    await resolveExpiredAuctions();

    return NextResponse.json({ success: true, locked: currentGw.is_locked, msg: "Synced" });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
