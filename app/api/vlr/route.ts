import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { fetchVlrMatches, scrapeMatchDetails } from "@/lib/vlr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("id");

  // Scrape specific match and Sync Stats
  if (matchId) {
    try {
      const result = await scrapeMatchDetails(matchId);
      if (!result) {
        console.error(`Match ${matchId}: Scrape returned null (likely 404 or rate limit)`);
        return NextResponse.json({ error: "Scrape failed - match not found or rate limited" }, { status: 404 });
      }
      const { stats: details, status: currentStatus } = result;
      if (details.length === 0) {
        console.warn(`Match ${matchId}: No player stats found (match may not have started yet)`);
        return NextResponse.json({ error: "No stats available yet" }, { status: 404 });
      }

      // 1. Get Match UUID from DB using VLR ID
      const { data: matchData } = await (supabaseAdmin
        .from('matches')
        .select('id')
        .eq('vlr_id', matchId)
        .single() as any);

      if (!matchData) {
         return NextResponse.json({ error: "Match not found in DB. Sync matches first." }, { status: 404 });
      }

      // 2. Get Players Map (Nickname -> UUID)
      const { data: playersData } = await supabaseAdmin
        .from('pro_players')
        .select('id, nickname')
        .returns<{ id: string; nickname: string }[]>();
      
      const playerMap = new Map<string, string>();
      playersData?.forEach((p) => {
          playerMap.set(p.nickname.toLowerCase(), p.id);
      });

      // 3. Prepare Upserts
      const performanceData = details
        .map(d => {
          const dbPlayerId = playerMap.get(d.nickname.toLowerCase());
          if (!dbPlayerId) return null;

          return {
              match_id: matchData.id,
              player_id: dbPlayerId,
              kills: d.kills,
              deaths: d.deaths,
              assists: d.assists,
              fb: d.fb,
              fd: d.fd || 0,
              clutches: d.clutches,
              acs: d.acs || 0,
              agent_name: d.agent_name,
              agent_role: d.agent_role,
              mvp: d.mvp || false,
              map_name: d.map_name || "Map 1" // Ensure map_name is included for unique constraint
          };
        })
        .filter((p): p is any => p !== null);
      
      if (performanceData.length > 0) {
          const { error } = await supabaseAdmin
            .from('player_performances')
            .upsert(performanceData as any, { onConflict: 'match_id,player_id,map_name' });
          
          if (error) {
              console.error("Error saving stats:", error);
              return NextResponse.json({ error: "DB Error", details: error }, { status: 500 });
          }
          
          // Update status if it's not live
          if (currentStatus && currentStatus !== 'live') {
              await (supabaseAdmin.from('matches') as any).update({ status: 'finished' }).eq('id', (matchData as any).id);
          }
      }

      return NextResponse.json({ 
          success: true, 
          synced: performanceData.length, 
          total_scraped: details.length,
          data: details 
      });

    } catch (error) {
      console.error("Match scrape error:", error);
      return NextResponse.json({ error: "Failed to scrape match details" }, { status: 500 });
    }
  }

  // Sincronización masiva de partidos próximos
  try {
    const data = await fetchVlrMatches();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("VLR scrape failed", error);
    return NextResponse.json({
        error: error.message,
        stats: [],
        upcomingMatches: [],
        scoring: []
    }, { status: 500 });
  }
}
