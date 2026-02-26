import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { supabaseAdmin } from "@/utils/supabase/admin";
import { calculateGameweekScores } from "@/lib/actions/scoring";
import { Database } from "@/types/supabase";

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
    const { fetchVlrMatches, scrapeMatchDetails } = await import("@/lib/vlr");
    const { getMarketLockStatus, autoCreateMissingGameweeks } = await import("@/lib/gameweek-logic");

    try {
        console.log("Cron: Actualizando lista de partidos desde VLR y autogenerando jornadas...");
        await Promise.all([
          fetchVlrMatches(),
          autoCreateMissingGameweeks(supabaseAdmin)
        ]);
    } catch (e) {
        console.error("Cron: Error in pre-sync steps:", e);
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
        if (now.getTime() > endDate.getTime() + 3600000) { // 1h margin after Sunday
            console.log(`Cron: Finalizando Jornada ${activeGw.name} (ID: ${activeGw.id}) por fecha de fin alcanzada.`);
            await calculateGameweekScores(activeGw.id, true);
            await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false }).eq('id', activeGw.id);
            currentGw = null;
        }
    }

    if (!currentGw) {
      console.log(`Cron: Buscando jornada para activar...`);
      const { data: nextStart } = await (supabaseAdmin
        .from('gameweeks')
        .select('*')
        .lte('start_date', now.toISOString())
        .order('start_date', { ascending: false })
        .limit(1) as any)
        .maybeSingle();
      
      currentGw = nextStart;

      if (currentGw) {
          console.log(`Cron: Activando Jornada: ${currentGw.name} (ID: ${currentGw.id})`);
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: false }).neq('id', currentGw.id);
          await (supabaseAdmin.from('gameweeks') as any).update({ is_active: true, is_locked: false }).eq('id', currentGw.id);
          
          // Reset weekly transfer counter
          await supabaseAdmin.from('league_participants').update({ transfers_made_this_week: 0 } as any);
          currentGw.is_active = true;
      } else {
         return NextResponse.json({ message: "No hay jornadas registradas para activar" });
      }
    }
    
    const activeGwId = currentGw.id;
    
    // --- B. UNIFORM LOCK LOGIC ---
    // Instead of custom logic, use the same logic as the frontend
    const lockStatus = await getMarketLockStatus(supabaseAdmin);
    
    if (currentGw.is_locked !== lockStatus.locked) {
      console.log(`Cron: Transición de Bloqueo: ${currentGw.is_locked ? "CERRADO" : "ABIERTO"} -> ${lockStatus.locked ? "CERRADO" : "ABIERTO"} (Motivo: ${lockStatus.reason})`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: lockStatus.locked }).eq('id', currentGw.id);
      currentGw.is_locked = lockStatus.locked;
    }

    // --- C. LINK MATCHES TO ACTIVE GW ---
    await (supabaseAdmin
      .from('matches') as any)
      .update({ gameweek_id: currentGw.id })
      .gte('match_date', currentGw.start_date)
      .lte('match_date', currentGw.end_date)
      .not('status', 'eq', 'finished')
      .or(`gameweek_id.is.null,gameweek_id.neq.${currentGw.id}`);

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
                    mvp: d.mvp || false
                });
            }
        }

        if (performaceUpserts.length > 0) {
            // MVP fallback: if none scraped, use highest ACS
            const hasScrapedMvp = performaceUpserts.some(p => p.mvp);
            let finalData = performaceUpserts;
            
            if (!hasScrapedMvp) {
                const maxAcs = Math.max(...performaceUpserts.map(p => p.acs));
                finalData = performaceUpserts.map(p => ({ ...p, mvp: (p.acs === maxAcs && p.acs > 0) }));
            }
            
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
