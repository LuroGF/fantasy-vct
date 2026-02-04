
import * as cheerio from "cheerio";

const VLR_MATCHES_URL = "https://www.vlr.gg/matches";

async function testScraper() {
  console.log("Fetching matches from VLR...");
  const response = await fetch(VLR_MATCHES_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html",
    }
  });

  if (!response.ok) {
    console.error("Fetch failed");
    return;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log("Analyzing match list items...");
  
  $(".match-item").each((_, element) => {
    const card = $(element);
    const event = card.find(".match-item-event").first().text().replace(/\s+/g, " ").trim();
    const teams = card.find(".match-item-vs-team-name").map((__, team) => $(team).text().replace(/\s+/g, " ").trim()).get();
    
    const isVctEmea = event.toUpperCase().includes("VCT") && 
                      event.toUpperCase().includes("EMEA") && 
                      !event.toUpperCase().includes("GAME CHANGERS") &&
                      !event.toUpperCase().includes("CHALLENGERS");
    
    console.log(`[${isVctEmea ? "SYNC" : "SKIP"}] Event: ${event} | Teams: ${teams.join(" vs ")}`);
  });
}

testScraper();
