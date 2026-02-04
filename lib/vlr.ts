import * as cheerio from "cheerio";
import { supabaseAdmin } from "./supabase";
import { Database } from "@/types/supabase";

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
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = vlrDate.split(', ');
    if (parts.length < 2) return null;
    const monthDay = parts[1].split(' ');
    const month = months[monthDay[0]];
    const day = parseInt(monthDay[1]);
    if (isNaN(month) || isNaN(day)) return null;
    const now = new Date();
    let year = now.getFullYear();
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
    return null;
  }
}

export async function fetchVlrMatches(): Promise<VlrPayload> {
  const response = await fetch(VLR_MATCHES_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) throw new Error("VLR fetch failed");
  const html = await response.text();
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

  const emeaMatches = results.filter((m) => m.isVctEmea);
  const finalMatches = emeaMatches.length > 0 ? emeaMatches.slice(0, 15) : results.slice(0, 10);

  // Sync with DB in background (ignore returned promise here to speed up)
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

async function syncMatchesToDb(matches: VlrMatch[]) {
    const { data: activeGw } = await supabaseAdmin.from('gameweeks').select('id').eq('is_active', true).single<any>();
    const { data: teamsData } = await supabaseAdmin.from('pro_teams').select('id, name, tag').returns<any[]>();
    
    const teamMap = new Map<string, string>();
    teamsData?.forEach((t) => {
      if (t.name) teamMap.set(t.name.toUpperCase(), t.id);
      if (t.tag) teamMap.set(t.tag.toUpperCase(), t.id);
    });

    const matchUpserts = matches.map((m) => {
        const parts = m.teams.split(" vs ");
        if (parts.length < 2) return null;

        let nameA = parts[0]?.toUpperCase() || "";
        let nameB = parts[1]?.toUpperCase() || "";
        
        const tagA = TEAM_ALIASES[nameA] || nameA;
        const tagB = TEAM_ALIASES[nameB] || nameB;
        
        const teamAId = teamMap.get(nameA) || teamMap.get(tagA);
        const teamBId = teamMap.get(nameB) || teamMap.get(tagB);
        
        if (!teamAId || !teamBId) {
            console.log(`Sync Skip: teams not found [${nameA} vs ${nameB}]`);
            return null;
        }

        return {
          vlr_id: m.id,
          team_a: teamAId,
          team_b: teamBId,
          match_date: m.date ? parseVlrDate(m.date, m.time) : null,
          status: m.time.toLowerCase().includes("live") ? 'live' : 'upcoming',
          gameweek_id: activeGw?.id || null,
        };
    }).filter((m): m is any => m !== null);

    if (matchUpserts.length > 0) {
      console.log(`Syncing ${matchUpserts.length} matches to DB...`);
      await supabaseAdmin.from('matches').upsert(matchUpserts as any, { onConflict: 'vlr_id' });
    }
}
