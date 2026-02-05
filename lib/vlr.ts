import * as cheerio from "cheerio";
import { supabaseAdmin } from "./supabase";

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

export type VlrMatch = { 
  time: string; 
  teams: string; 
  event: string; 
  id: string; 
  date?: string; 
  isVctEmea?: boolean;
};

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: VlrMatch[];
  scoring: { label: string; value: string }[];
};

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
  "ULF ESPORTS": "ULF",
};

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseVlrDate(vlrDate: string, vlrTime: string) {
  try {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    // El formato suele ser "Weekday, Month Day, Year" o "Today, Month Day"
    const parts = vlrDate.split(',').map(p => p.trim());
    if (parts.length < 2) return null;

    // Buscamos el bloque que contiene el mes (ej: "February 5")
    const monthDayPart = parts[1].split(' ');
    const monthName = monthDayPart[0];
    const day = parseInt(monthDayPart[1]);
    const month = months[monthName];

    if (month === undefined || isNaN(day)) return null;

    const now = new Date();
    let year = now.getFullYear();

    // Si el tercer fragmento es un año, lo usamos
    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
        year = parseInt(parts[2]);
    } else if (now.getMonth() === 11 && month === 0) {
        year++;
    }

    const date = new Date(year, month, day);
    
    if (vlrTime && vlrTime.toLowerCase() !== 'live' && !vlrTime.includes('h')) {
        const timeMatch = vlrTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            // Establacer hora en UTC o local segun prefieras, VLR suele estar en UTC/timezone del server
            // Por ahora mantenemos la logica original pero aseguramos el set
            date.setHours(hours, minutes, 0, 0);
        }
    }
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

export async function fetchVlrMatches(): Promise<VlrPayload> {
  const fetchPage = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return response.text();
  };

  const [upcomingHtml, resultsHtml] = await Promise.all([
    fetchPage(VLR_MATCHES_URL),
    fetchPage("https://www.vlr.gg/matches/results")
  ]);

  if (!upcomingHtml) throw new Error("VLR upcoming fetch failed");
  
  const parseMatches = (html: string) => {
    const $ = cheerio.load(html);
    const results: VlrMatch[] = [];

    $(".wf-label.mod-large").each((_, label) => {
      const rawDate = $(label).text().trim();
      let next = $(label).next();
      while (next.length && !next.hasClass("wf-label")) {
        const processItem = (item: any) => {
          const card = $(item);
          const id = card.attr("href")?.split("/")[1] || "";
          const time = cleanText(card.find(".match-item-time").first().text());
          const event = cleanText(card.find(".match-item-event").first().text());
          const teams = card.find(".match-item-vs-team-name").map((__, team) => cleanText($(team).text())).get().filter(Boolean);
          const teamsLabel = teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";
          const isVctEmea = event.toUpperCase().includes("VCT") && event.toUpperCase().includes("EMEA") && !event.toUpperCase().includes("GAME CHANGERS") && !event.toUpperCase().includes("CHALLENGERS");

          if (teamsLabel && event) {
            results.push({ time: time || "LIVE", teams: teamsLabel, event, id, date: rawDate, isVctEmea });
          }
        };
        if (next.hasClass("match-item")) processItem(next);
        else next.find(".match-item").each((__, item) => processItem(item));
        next = next.next();
      }
    });
    return results;
  };

  const upcomingResults = parseMatches(upcomingHtml);
  const finishedResults = resultsHtml ? parseMatches(resultsHtml) : [];
  
  // Merge and deduplicate by ID
  const allMatches = [...upcomingResults, ...finishedResults];
  const uniqueMatchesMap = new Map();
  allMatches.forEach(m => {
    if (!uniqueMatchesMap.has(m.id)) {
      uniqueMatchesMap.set(m.id, m);
    }
  });
  
  const results = Array.from(uniqueMatchesMap.values());
  const emeaMatches = results.filter((m) => m.isVctEmea);
  const finalMatches = emeaMatches.length > 0 ? emeaMatches.slice(0, 15) : results.slice(0, 10);

  // Sync with DB in background
  syncMatchesToDb(finalMatches).catch(console.error);

  return {
    stats: [],
    upcomingMatches: finalMatches,
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

export async function scrapeMatchDetails(matchId: string) {
    const url = `https://www.vlr.gg/${matchId}`;
    
    try {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    
      if (!response.ok) {
        console.error(`VLR fetch failed for ${matchId}: ${response.status} ${response.statusText}`);
        return null;
      }
    
      const html = await response.text();
      
      // Check if we got an error page instead of match data
      if (html.includes('<!DOCTYPE') && !html.includes('vm-stats')) {
        console.error(`VLR returned error page for ${matchId} (likely rate limited or match not found)`);
        return null;
      }
      
      const $ = cheerio.load(html);
      const stats: any[] = [];
    
      $(".wf-table-container").first().find("tbody tr").each((_, row) => {
        const cols = $(row).find("td");
        if (cols.length < 10) return;
    
        const playerLink = $(cols[0]).find("a").attr("href") || "";
        const playerId = playerLink.split("/")[2] || "";
        const nickname = cleanText($(cols[0]).find(".mod-player").text());
        
        const kdaRaw = cleanText($(cols[2]).find(".mod-vlr-kills").text());
        const dRaw = cleanText($(cols[3]).find(".mod-vlr-deaths").text());
        const aRaw = cleanText($(cols[4]).find(".mod-vlr-assists").text());
        const fkRaw = cleanText($(cols[9]).text());
        const fdRaw = cleanText($(cols[10]).text());
    
        stats.push({
          vlr_id: playerId,
          nickname,
          kills: parseInt(kdaRaw) || 0,
          deaths: parseInt(dRaw.replace("/", "")) || 0,
          assists: parseInt(aRaw) || 0,
          fb: parseInt(fkRaw) || 0,
          fd: parseInt(fdRaw) || 0,
          clutches: 0
        });
      });
    
      return stats;
    } catch (error) {
      console.error(`Exception scraping match ${matchId}:`, error);
      return null;
    }
}

async function getOrCreateGameweekByDate(dateStr: string) {
    const date = new Date(dateStr);
    // Calcular Lunes 00:00 y Domingo 23:59
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startStr = monday.toISOString();
    
    // Buscar si existe
    const { data: existing } = await (supabaseAdmin
        .from('gameweeks')
        .select('id')
        .eq('start_date', startStr)
        .order('id', { ascending: true })
        .limit(1) as any)
        .maybeSingle();
    
    if (existing) return (existing as any).id;

    // Crear nueva
    const weekLabel = monday.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    const { data: created, error } = await (supabaseAdmin
        .from('gameweeks')
        .insert({
            name: `Jornada ${weekLabel}`,
            start_date: startStr,
            end_date: sunday.toISOString(),
            is_active: false,
            is_locked: false
        } as any) as any)
        .select('id')
        .single();
    
    if (error) {
        console.error("Error creating gameweek:", error);
        return null;
    }
    return (created as any).id;
}

export async function syncMatchesToDb(matches: VlrMatch[]) {
    const { data: teamsData } = await (supabaseAdmin.from('pro_teams').select('id, name, tag') as any);
    
    // De esta forma protegemos los partidos finalizados de ser sobreescritos por error
    const { data: existingMatches } = await (supabaseAdmin.from('matches').select('vlr_id, status') as any);
    const finishedIds = new Set((existingMatches as any[])?.filter((m: any) => m.status === 'finished').map((m: any) => m.vlr_id) || []);

    const teamMap = new Map<string, string>();
    (teamsData as any[])?.forEach((t: any) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    const matchUpserts = [];

    for (const m of matches) {
        if (finishedIds.has(m.id)) continue;

        const parts = m.teams.split(" vs ");
        if (parts.length < 2) continue;

        let nameA = parts[0]?.toUpperCase() || "";
        let nameB = parts[1]?.toUpperCase() || "";
        
        const tagA = TEAM_ALIASES[nameA] || nameA;
        const tagB = TEAM_ALIASES[nameB] || nameB;
        
        const teamAId = teamMap.get(nameA) || teamMap.get(tagA);
        const teamBId = teamMap.get(nameB) || teamMap.get(tagB);
        
        if (!teamAId || !teamBId) {
            console.log(`Sync Skip: teams not found [${nameA} vs ${nameB}]`);
            continue;
        }

        const matchDate = m.date ? parseVlrDate(m.date, m.time) : null;
        let gwId = null;
        if (matchDate) {
            gwId = await getOrCreateGameweekByDate(matchDate);
        }

        let status = 'upcoming';
        const timeLower = m.time.toLowerCase();
        if (timeLower.includes("live")) {
            status = 'live';
        } else if (timeLower.includes("final") || /\d+-\d+/.test(m.time)) {
            status = 'finished';
        }

        matchUpserts.push({
          vlr_id: m.id,
          team_a: teamAId,
          team_b: teamBId,
          match_date: matchDate,
          status: status,
          gameweek_id: gwId,
        });
    }

    if (matchUpserts.length > 0) {
      console.log(`Syncing ${matchUpserts.length} matches to DB...`);
      await supabaseAdmin.from('matches').upsert(matchUpserts as any, { onConflict: 'vlr_id' });
    }
}
