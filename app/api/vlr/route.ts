import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/lib/supabase";

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function scrapeMatchDetails(matchId: string) {
  const url = `https://www.vlr.gg/${matchId}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);
  const stats: any[] = [];

  // Main stats table
  $(".wf-table-container").first().find("tbody tr").each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length < 10) return; // Need at least items for FK/FD

    const playerLink = $(cols[0]).find("a").attr("href") || "";
    const playerId = playerLink.split("/")[2] || "";
    const nickname = cleanText($(cols[0]).find(".mod-player").text());
    
    // Kills / Deaths / Assists
    const kdaRaw = cleanText($(cols[2]).find(".mod-vlr-kills").text());
    const dRaw = cleanText($(cols[3]).find(".mod-vlr-deaths").text());
    const aRaw = cleanText($(cols[4]).find(".mod-vlr-assists").text());

    // FK / FD (Indices 9 and 10 usually)
    const fkRaw = cleanText($(cols[9]).text());
    const fdRaw = cleanText($(cols[10]).text());

    stats.push({
      vlr_player_id: playerId,
      nickname,
      kills: parseInt(kdaRaw) || 0,
      deaths: parseInt(dRaw.replace("/", "")) || 0,
      assists: parseInt(aRaw) || 0,
      fb: parseInt(fkRaw) || 0, // treating FK as First Blood for scoring
      fd: parseInt(fdRaw) || 0,
      clutches: 0 // Placeholder: Clutches require parsing 'Performance' tab
    });
  });

  return stats;
}

function parseVlrDate(vlrDate: string, vlrTime: string) {
  try {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // vlrDate is e.g. "Wednesday, Feb 4"
    const parts = vlrDate.split(', ');
    if (parts.length < 2) return null;
    
    const monthDay = parts[1].split(' ');
    const month = months[monthDay[0]];
    const day = parseInt(monthDay[1]);
    
    if (isNaN(month) || isNaN(day)) return null;

    // Current date for year context
    const now = new Date();
    let year = now.getFullYear();

    // If we're in Dec and the match is Jan, it's next year
    if (now.getMonth() === 11 && month === 0) year++;
    
    const date = new Date(year, month, day);
    
    if (vlrTime && vlrTime.toLowerCase() !== 'live' && !vlrTime.includes('h')) {
        const timeMatch = vlrTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            date.setHours(hours, minutes);
        }
    }
    
    return date.toISOString();
  } catch (e) {
    console.error("Error parsing date:", vlrDate, vlrTime, e);
    return null;
  }
}

import { fetchVlrMatches } from "@/lib/vlr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("id");

  // Scrape specific match and Sync Stats
  if (matchId) {
    try {
      const details = await scrapeMatchDetails(matchId);
      if (!details) return NextResponse.json({ error: "Scrape failed" }, { status: 404 });

      // 1. Get Match UUID from DB using VLR ID
      const { data: matchData } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('vlr_id', matchId)
        .returns<{ id: string }[]>()
        .single();

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
              clutches: d.clutches,
          };
        })
        .filter((p): p is any => p !== null);
      
      if (performanceData.length > 0) {
          const { error } = await supabaseAdmin
            .from('player_performances')
            .upsert(performanceData as any, { onConflict: 'match_id,player_id' });
          
          if (error) {
              console.error("Error saving stats:", error);
              return NextResponse.json({ error: "DB Error", details: error }, { status: 500 });
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
