
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
  
  console.log("Analyzing matches by date...");
  
  $(".wf-label.mod-large").each((_, label) => {
    const dateStr = $(label).text().trim();
    console.log(`\n--- Date: ${dateStr} ---`);
    
    let next = $(label).next();
    while (next.length && !next.hasClass("wf-label")) {
      const processItem = (item) => {
        const card = $(item);
        const event = card.find(".match-item-event").first().text().replace(/\s+/g, " ").trim();
        const teams = card.find(".match-item-vs-team-name").map((__, team) => $(team).text().replace(/\s+/g, " ").trim()).get();
        const time = card.find(".match-item-time").first().text().trim();
        
        const isVctEmea = event.toUpperCase().includes("VCT") && 
                          event.toUpperCase().includes("EMEA") && 
                          !event.toUpperCase().includes("GAME CHANGERS") &&
                          !event.toUpperCase().includes("CHALLENGERS");
        
        console.log(`  [${isVctEmea ? "SYNC" : "SKIP"}] ${time} | ${teams.join(" vs ")} (${event})`);
      };

      if (next.hasClass("match-item")) {
        processItem(next);
      } else {
        next.find(".match-item").each((__, item) => processItem(item));
      }
      next = next.next();
    }
  });
}

testScraper();
