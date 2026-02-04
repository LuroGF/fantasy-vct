import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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

    // --- A. AUTO-LOCK ---
    const startTime = new Date(activeGw.start_date).getTime();
    const lockTime = startTime - (24 * 60 * 60 * 1000); 
    
    if (now.getTime() >= lockTime && !activeGw.is_locked) {
      console.log(`Cron: Bloqueando mercado para la jornada ${activeGw.name}`);
      await (supabaseAdmin.from('gameweeks') as any).update({ is_locked: true }).eq('id', activeGw.id);
      (activeGw as any).is_locked = true;
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
      .select('id, vlr_id, status, match_date')
      .eq('gameweek_id', activeGw.id)
      .neq('status', 'finished') as any);

    if (matchError) throw matchError;

    for (const match of (matches as any[]) || []) {
      if (!match.vlr_id) continue;
      
      const matchTime = match.match_date ? new Date(match.match_date).getTime() : 0;
      if (now.getTime() < matchTime - (30 * 60 * 1000)) continue; 

      try {
        // Import and call scrapeMatchDetails directly instead of HTTP to avoid auth issues
        const { scrapeMatchDetails } = await import('@/lib/vlr');
        const details = await scrapeMatchDetails(match.vlr_id);
        
        if (!details || details.length === 0) {
          console.log(`Cron: Partido ${match.vlr_id} sin estadísticas disponibles aún.`);
          continue;
        }

        // Get Players Map (Nickname -> UUID)
        const { data: playersData } = await supabaseAdmin
          .from('pro_players')
          .select('id, nickname')
          .returns<{ id: string; nickname: string }[]>();
        
        const playerMap = new Map<string, string>();
        playersData?.forEach((p) => {
          playerMap.set(p.nickname.toLowerCase(), p.id);
        });

        // Prepare Upserts
        const performanceData = details
          .map(d => {
            const dbPlayerId = playerMap.get(d.nickname.toLowerCase());
            if (!dbPlayerId) return null;

            return {
              match_id: match.id,
              player_id: dbPlayerId,
              kills: d.kills,
              deaths: d.deaths,
              assists: d.assists,
              fb: d.fb,
              clutches: d.clutches,
            };
          })
          .filter((p): p is any => p !== null);
        
        if (performanceData.length > 0) {
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
