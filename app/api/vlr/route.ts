import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

export const revalidate = 60;

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string; id: string }[];
  scoring: { label: string; value: string }[];
};

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

// Mapeo manual de alias de equipos para mejorar el matching con la DB
const TEAM_ALIASES: Record<string, string> = {
  "FNATIC": "FNC",
  "TEAM VITALITY": "VIT",
  "TEAM HERETICS": "TH",
  "KARMINE CORP": "KC",
  "NAVI": "NAVI",
  "NATUS VINCERE": "NAVI",
  "BBL ESPORTS": "BBL",
  "FUT ESPORTS": "FUT",
  "GIANTX": "GX",
  "KOI": "KOI",
  "TEAM LIQUID": "TL",
  "GENTLE MATES": "M8",
  "ULF ESPORTS": "ULF", // Añadido para el evento actual
};

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseUpcomingMatches(html: string) {
  const $ = cheerio.load(html);
  const results: VlrPayload["upcomingMatches"] = [];

  $(".match-item").each((_, element) => {
    const card = $(element);
    const id = card.attr("href")?.split("/")[1] || "";
    const time = cleanText(card.find(".match-item-time").first().text());
    const event = cleanText(card.find(".match-item-event").first().text());
    
    const teams = card
      .find(".match-item-vs-team-name")
      .map((__, team) => cleanText($(team).text()))
      .get()
      .filter(Boolean);

    const teamsLabel =
      teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";

    //Solo VCT EMEA principal
    const isVctEmea = event.toUpperCase().includes("VCT") && 
                      event.toUpperCase().includes("EMEA") && 
                      !event.toUpperCase().includes("GAME CHANGERS") &&
                      !event.toUpperCase().includes("CHALLENGERS");

    if (teamsLabel && event && isVctEmea) {
      results.push({
        time: time || "LIVE",
        teams: teamsLabel,
        event,
        id,
      });
    }
  });

  if (results.length === 0) {
    $(".match-item").slice(0, 6).each((_, element) => {
        const card = $(element);
        const id = card.attr("href")?.split("/")[1] || "";
        const time = cleanText(card.find(".match-item-time").first().text());
        const event = cleanText(card.find(".match-item-event").first().text());
        const teams = card.find(".match-item-vs-team-name").map((__, team) => cleanText($(team).text())).get();
        if (teams.length >= 2) {
            results.push({
                time: time || "LIVE",
                teams: `${teams[0]} vs ${teams[1]}`,
                event,
                id
            });
        }
    });
  }

  return results.slice(0, 10);
}

async function loadVlrData(): Promise<VlrPayload> {
  const response = await fetch(VLR_MATCHES_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FantasyVCT/1.0; +https://fantasy-vct.local)",
      Accept: "text/html",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`VLR fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const upcomingMatches = parseUpcomingMatches(html);

  return {
    stats: [], // Ahora se obtienen en el Dashboard directamente
    upcomingMatches: upcomingMatches,
    scoring: [
        { label: "Kill", value: "+2" },
        { label: "Assist", value: "+1" },
        { label: "First blood", value: "+3" },
        { label: "Clutch round", value: "+4" },
        { label: "Match win", value: "+5" },
        { label: "Series MVP", value: "+6" },
    ],
  };
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

export async function GET(request: Request) {
  const supabase = await createClient(); // For auth context if needed
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
      // In a real app we might store vlr_player_id in pro_players to be safer
      const { data: playersData } = await supabaseAdmin
        .from('pro_players')
        .select('id, nickname')
        .returns<{ id: string; nickname: string }[]>();
      
      const playerMap = new Map<string, string>();
      playersData?.forEach((p) => {
          playerMap.set(p.nickname.toLowerCase(), p.id);
      });

      // 3. Prepare Upserts
      type PerformanceInsert = Database['public']['Tables']['player_performances']['Insert'];
      
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
              // fantasy_points will be calculated by trigger
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      
      const performances: PerformanceInsert[] = performanceData;

      if (performances.length > 0) {
          const { error } = await supabaseAdmin
            .from('player_performances')
            .upsert(performances as any, { onConflict: 'match_id,player_id' });
          
          if (error) {
              console.error("Error saving stats:", error);
              return NextResponse.json({ error: "DB Error", details: error }, { status: 500 });
          }
      }

      return NextResponse.json({ 
          success: true, 
          synced: performances.length, 
          total_scraped: details.length,
          data: details 
      });

    } catch (error) {
      console.error("Match scrape error:", error);
      return NextResponse.json({ error: "Failed to scrape match details" }, { status: 500 });
    }
  }

  // Si no, flujo normal de partidos próximos (Existing logic)
  try {
    const data = await loadVlrData();
    
    // Sincronización con DB
    const { data: teamsData } = await supabaseAdmin
        .from('pro_teams')
        .select('id, name, tag')
        .returns<{ id: string; name: string; tag: string }[]>();

    const teamMap = new Map<string, string>();
    
    teamsData?.forEach((t) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    type MatchInsert = Database['public']['Tables']['matches']['Insert'];
    
    const matchUpserts: MatchInsert[] = data.upcomingMatches
      .map(m => {
        const parts = m.teams.split(" vs ");
        let nameA = parts[0]?.toUpperCase() || "";
        let nameB = parts[1]?.toUpperCase() || "";
        
        // Intentar resolver por alias si no hay match directo
        const tagA = TEAM_ALIASES[nameA] || nameA;
        const tagB = TEAM_ALIASES[nameB] || nameB;
        
        const teamAId = teamMap.get(nameA) || teamMap.get(tagA);
        const teamBId = teamMap.get(nameB) || teamMap.get(tagB);
        
        if (!teamAId || !teamBId) {
           console.log(`Sync Skip: Missing Team in DB!`);
           console.log(`Team A: [${nameA}] -> Map: [${teamAId || 'EMPTY'}]`);
           console.log(`Team B: [${nameB}] -> Map: [${teamBId || 'EMPTY'}]`);
           return null;
        }

        const matchData: MatchInsert = {
          vlr_id: m.id,
          team_a: teamAId,
          team_b: teamBId,
          status: m.time.toLowerCase().includes("live") ? 'live' : 'upcoming',
        };
        
        return matchData;
      })
      .filter((m): m is MatchInsert => m !== null);

    if (matchUpserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('matches').upsert(matchUpserts as any, { onConflict: 'vlr_id' });
      if (upsertError) console.error("Sync: Error upserting matches:", upsertError);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("VLR scrape failed", error);
    return NextResponse.json({
        stats: [],
        upcomingMatches: [],
        scoring: []
    });
  }
}
