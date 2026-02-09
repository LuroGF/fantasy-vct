
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";
import { fetchVlrMatches } from "@/lib/vlr";

export async function GET(request: Request) {
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

    if (!activeGw) {
      console.log("Cron: No hay jornada activa. Buscando próxima...");
      const { data: currentOrUpcoming } = await (supabaseAdmin
        .from('gameweeks')
        .select('*')
        .lte('start_date', now.toISOString())
        .gte('end_date', now.toISOString())
        .order('start_date', { ascending: true })
        .limit(1) as any)
        .maybeSingle() as { data: Database['public']['Tables']['gameweeks']['Row']; error: any };

      let targetGw = currentOrUpcoming;

      if (!targetGw) {
        // Find the absolute next one starting
        const { data: nextStart } = await (supabaseAdmin
          .from('gameweeks')
          .select('*')
          .gt('start_date', now.toISOString())
          .order('start_date', { ascending: true })
          .limit(1) as any)
          .maybeSingle();
        targetGw = nextStart;
      }

      if (targetGw) {
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true }).eq('id', targetGw.id);
          
          // Reset weekly transfer counter for all participants
          console.log(`Cron: Jornada activada automáticamente (${targetGw.name}). Reseteando contador de transferencias...`);
          await supabaseAdmin.from('league_participants').update({ transfers_made_this_week: 0 } as any);
          
          return NextResponse.json({ message: `Jornada ${targetGw.name} activada` });
      }
      return NextResponse.json({ message: "No hay jornadas futuras" });
    }
    
    // 1. Obtener partidos de la jornada
    const { data: gwMatches } = await (supabaseAdmin
      .from('matches')
      .select('match_date, status, vlr_id')
      .eq('gameweek_id', activeGw.id) as any);
      
    let shouldLock = false; 

    if (gwMatches && gwMatches.length > 0) {
        const nowMs = now.getTime();
        
        // 1. Any LIVE match? -> LOCK
        const hasLive = gwMatches.some((m: any) => m.status === 'live');
        
        // 2. Any UPCOMING match starting soon (< 60 mins)? -> LOCK
        const startsSoon = gwMatches.some((m: any) => {
            if (m.status !== 'upcoming' || !m.match_date) return false;
            const startTime = new Date(m.match_date).getTime();
            return startTime > nowMs && startTime - nowMs < 3600000; // 1 hour buffer
        });

        // 3. Any match TODAY that is pending/live? (Based on Madrid 11:00 AM cutoff)
        const todayString = madridTime.toISOString().split('T')[0];
        const pendingToday = gwMatches.some((m: any) => {
            if (!m.match_date || m.status === 'finished') return false;
            const mDate = new Date(m.match_date);
            const mMadrid = new Date(mDate.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
            const isToday = mMadrid.toISOString().split('T')[0] === todayString;
            return isToday && madridHour >= 11; // Only lock today's matches after 11:00
        });

        if (hasLive || startsSoon || pendingToday) {
            shouldLock = true;
            console.log(`Cron: Mercado BLOQUEADO. Motivo: ${hasLive ? 'PARTIDO EN VIVIDO' : startsSoon ? 'PARTIDO COMIENZA PRONTO' : 'PARTIDOS PENDIENTES HOY'}`);
        } else {
            shouldLock = false;
            console.log("Cron: Mercado ABIERTO. No hay actividad inmediata.");
        }
    }

    if (activeGw.is_locked !== shouldLock) {
      console.log(`Cron: Actualizando Lock: ${activeGw.is_locked} -> ${shouldLock}`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: shouldLock }).eq('id', activeGw.id);
      (activeGw as any).is_locked = shouldLock;
    }

    // --- B. VINCULAR PARTIDOS ---
    await (supabaseAdmin
      .from('matches') as any)
      .update({ gameweek_id: activeGw.id })
      .is('gameweek_id', null)
      .gte('match_date', activeGw.start_date)
      .lte('match_date', activeGw.end_date);

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
      .eq('gameweek_id', activeGw.id) as any);

    const matchToSync = (allGwMatches as any[])?.filter(m => {
        // If live, sync
        if (m.status === 'live') return true;
        
        // If upcoming and close (< 30m), sync (maybe lineups?)
        const mTime = m.match_date ? new Date(m.match_date).getTime() : 0;
        if (m.status === 'upcoming' && now.getTime() > mTime - 1800000 && now.getTime() < mTime + 7200000) return true;

        // If finished but no stats, sync
        if (m.status === 'finished' && (!m.player_performances || m.player_performances.length === 0)) return true;
        
        return false;
    }) || [];

    // Player Map Cache
    const { data: playersData } = await supabaseAdmin.from('pro_players').select('id, nickname').returns<{ id: string; nickname: string }[]>();
    const playerMap = new Map();
    playersData?.forEach((p) => playerMap.set(p.nickname.toLowerCase(), p.id));

    for (const match of matchToSync) {
      if (!match.vlr_id) continue;
      
      try {
        const { scrapeMatchDetails } = await import('@/lib/vlr');
        const details = await scrapeMatchDetails(match.vlr_id);
        
        if (!details || details.length === 0) continue;

        const performaceUpserts = [];
        
        for (const d of details) {
            let dbPlayerId = playerMap.get(d.nickname.toLowerCase());
            // Create player if missing logic (Simplified from previous)
            if (!dbPlayerId) {
                 // Try to create... (omitted detailed creation for brevity, assuming scrapeMatchDetails is enough or handled previously)
                 // But wait, the previous code had complex creation logic. I should keep it.
                 // Re-implementing simplified version:
                 
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
                         nickname: d.nickname, team_id: teamId, role: 'Duelista', market_value: 5000000 
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
                    kills: d.kills, deaths: d.deaths, assists: d.assists,
                    fb: d.fb, fd: d.fd || 0, acs: d.acs || 0, clutches: d.clutches,
                    mvp: false
                });
            }
        }

        if (performaceUpserts.length > 0) {
            const maxAcs = Math.max(...performaceUpserts.map(p => p.acs));
            const finalData = performaceUpserts.map(p => ({ ...p, mvp: p.acs === maxAcs }));
            
            await supabaseAdmin.from('player_performances').upsert(finalData as any, { onConflict: 'match_id,player_id' });
            
            // Ensure status is finished
            if (match.status !== 'finished') {
                await (supabaseAdmin.from('matches') as any).update({ status: 'finished' }).eq('id', match.id);
            }
            console.log(`Cron: Stats saved for ${match.vlr_id}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
          console.error(`Error syncing match ${match.vlr_id}`, e);
      }
    }

    // --- D. CALCULAR PUNTUACIONES ---
    const scoreResult = await calculateGameweekScores(activeGw.id);

    // --- E. AUTO-NEXT ---
    const { data: pendingMatches } = await (supabaseAdmin
        .from('matches')
        .select('id')
        .eq('gameweek_id', activeGw.id)
        .neq('status', 'finished') as any);

    if ((pendingMatches as any[])?.length === 0 && now > new Date(activeGw.end_date)) {
         await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false, is_locked: false }).eq('id', activeGw.id);
         
         // Activate next gameweek
         const { data: nextGw } = await (supabaseAdmin.from('gameweeks').select('*').gt('start_date', activeGw.start_date).order('start_date').limit(1) as any).maybeSingle();
         if (nextGw) {
             await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true }).eq('id', nextGw.id);
             
             // Reset weekly transfer counter for all participants
             console.log(`Cron: Nueva jornada activada (${nextGw.name}). Reseteando contador de transferencias...`);
             await supabaseAdmin.from('league_participants').update({ transfers_made_this_week: 0 } as any);
         }
    }

    // --- F. MERCADO ---
    const { updateMarketValues } = await import('@/lib/actions/market-dynamics');
    await updateMarketValues();

    return NextResponse.json({ success: true, locked: activeGw.is_locked, msg: "Synced" });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
