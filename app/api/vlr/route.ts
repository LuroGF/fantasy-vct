import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const revalidate = 60;

export type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string }[];
  scoring: { label: string; value: string }[];
};

const fallbackData: VlrPayload = {
  stats: [
    { label: "Active leagues", value: "128" },
    { label: "Weekly managers", value: "4.2k" },
    { label: "Matches tracked", value: "312" },
  ],
  upcomingMatches: [
    { time: "14:00", teams: "FNATIC vs NAVI", event: "VCT EMEA" },
    { time: "17:30", teams: "LOUD vs LEV", event: "VCT Americas" },
    { time: "20:00", teams: "PRX vs DRX", event: "VCT Pacific" },
  ],
  scoring: [
    { label: "Kill", value: "+2" },
    { label: "Assist", value: "+1" },
    { label: "First blood", value: "+3" },
    { label: "Clutch round", value: "+4" },
    { label: "Match win", value: "+5" },
    { label: "Series MVP", value: "+6" },
  ],
};

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function parseUpcomingMatches(html: string) {
  const $ = cheerio.load(html);
  const cards = $(
    ".match-item, .match-item-vs, .wf-card, [class*='match-item']"
  );
  const results: VlrPayload["upcomingMatches"] = [];

  cards.each((_, element) => {
    const card = $(element);
    const time = cleanText(
      card
        .find(
          ".match-item-time, .match-item__time, .match-item-time-live, [class*='match-item-time']"
        )
        .first()
        .text()
    );

    const event = cleanText(
      card
        .find(
          ".match-item-event, .match-item-event-series, .match-item__event, [class*='match-item-event']"
        )
        .first()
        .text()
    );

    const teams = card
      .find(
        ".match-item-vs-team-name, .match-item__team-name, .match-item-vs-team, [class*='team-name']"
      )
      .map((__, team) => cleanText($(team).text()))
      .get()
      .filter(Boolean);

    const teamsLabel =
      teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : teams[0] ?? "";

    if (teamsLabel && event) {
      results.push({
        time: time || "TBD",
        teams: teamsLabel,
        event,
      });
    }
  });

  return results.slice(0, 6);
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
    stats: fallbackData.stats,
    upcomingMatches: upcomingMatches.length
      ? upcomingMatches
      : fallbackData.upcomingMatches,
    scoring: fallbackData.scoring,
  };
}

export async function GET() {
  try {
    const data = await loadVlrData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("VLR scrape failed", error);
    return NextResponse.json(fallbackData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}
