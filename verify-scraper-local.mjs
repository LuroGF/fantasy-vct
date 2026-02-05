
import * as cheerio from "cheerio";
import fs from "fs";

function cleanText(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function testLocalScraper() {
    console.log("Testing IMPROVED local scraper logic on vlr-594757.html...");
    const html = fs.readFileSync("vlr-594757.html", "utf8");
    const $ = cheerio.load(html);
    
    // Logic from lib/vlr.ts
    const tables = $("table.wf-table-inset.mod-overview");
    console.log(`Found ${tables.length} overview tables.`);

    const statsMap = new Map();
    tables.each((_, table) => {
        const rows = $(table).find("tr").slice(1);
        
        rows.each((__, row) => {
            const cols = $(row).find("td");
            if (cols.length < 10) return;

            const playerLink = $(cols[0]).find("a").attr("href") || "";
            const playerId = playerLink.split("/")[2] || "";
            const nickname = cleanText($(cols[0]).find(".mod-player").find(".text-of").text() || $(cols[0]).find(".mod-player").text());
            
            if (!nickname || !playerId || nickname.toLowerCase().includes("team")) return;

            const kRaw = cleanText($(cols[4]).find(".mod-both").first().text());
            const dRaw = cleanText($(cols[5]).find(".mod-both").first().text());
            const aRaw = cleanText($(cols[6]).find(".mod-both").first().text());
            const fkRaw = cleanText($(cols[11]).find(".mod-both").first().text());
            const fdRaw = cleanText($(cols[12]).find(".mod-both").first().text());

            const currentStats = {
                vlr_id: playerId,
                nickname,
                kills: parseInt(kRaw) || 0,
                deaths: parseInt(dRaw) || 0,
                assists: parseInt(aRaw) || 0,
                fb: parseInt(fkRaw) || 0,
                fd: parseInt(fdRaw) || 0
            };

            const existing = statsMap.get(playerId);
            if (!existing || currentStats.kills > existing.kills) {
                statsMap.set(playerId, currentStats);
            }
        });
    });

    const stats = Array.from(statsMap.values());
    console.log(`Extracted ${stats.length} unique players stats.`);
    console.table(stats.slice(0, 10));
    
    // Expect 10 players for a match (2 teams of 5)
    // Actually, in the All Maps view there should be 10 players.
    if (stats.length === 10) {
        console.log("✅ SUCCESS: Found precisely 10 players.");
    } else {
        console.log(`⚠️ WARNING: Found ${stats.length} players instead of 10.`);
    }
}

testLocalScraper();
