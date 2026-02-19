
import * as cheerio from "cheerio";

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

async function checkEmeaTeams() {
  const response = await fetch(VLR_MATCHES_URL, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!response.ok) return;

  const html = await response.text();
  const $ = cheerio.load(html);
  
  const matches = [];
  
  $(".match-item").each((_, element) => {
    const card = $(element);
    const event = card.find(".match-item-event").first().text().replace(/\s+/g, " ").trim();
    const teams = card.find(".match-item-vs-team-name").map((__, team) => $(team).text().replace(/\s+/g, " ").trim()).get();
    
    if (event.toUpperCase().includes("EMEA") && event.toUpperCase().includes("VCT")) {
      matches.push({ event, teams });
    }
  });

  console.log("Matches found for VCT EMEA:");
  console.table(matches);
}

checkEmeaTeams();
