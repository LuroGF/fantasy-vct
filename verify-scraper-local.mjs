
import * as cheerio from "cheerio";
import fs from "fs";

function cleanText(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function testLocalScraper() {
    console.log("Testing local scraper logic on vlr-594757.html...");
    const html = fs.readFileSync("vlr-594757.html", "utf8");
    const $ = cheerio.load(html);
    
    // Debug selection
    const tables = $("table.wf-table-inset.mod-overview");
    console.log(`Found ${tables.length} overview tables.`);

    const stats = [];
    tables.each((i, table) => {
        console.log(`Table ${i} has ${$(table).find("tr").length} total rows (including header).`);
        
        // Let's try finding tr directly if tbody tr fails
        const rows = $(table).find("tr").slice(1); // skip header
        console.log(`Table ${i} has ${rows.length} data rows.`);

        rows.each((j, row) => {
            const cols = $(row).find("td");
            if (cols.length < 10) return;

            const playerCell = $(cols[0]);
            const nickname = cleanText(playerCell.find(".text-of").first().text() || playerCell.text());
            
            // Indices: K=4, D=5, A=6, FK=11, FD=12
            const kRaw = cleanText($(cols[4]).find(".mod-both").text());
            const dRaw = cleanText($(cols[5]).find(".mod-both").text());
            const aRaw = cleanText($(cols[6]).find(".mod-both").text());
            const fkRaw = cleanText($(cols[11]).find(".mod-both").text());
            const fdRaw = cleanText($(cols[12]).find(".mod-both").text());

            if (!nickname || nickname.includes("Team")) return;

            stats.push({
                nickname,
                kills: parseInt(kRaw) || 0,
                deaths: parseInt(dRaw) || 0,
                assists: parseInt(aRaw) || 0,
                fb: parseInt(fkRaw) || 0,
            });
        });
    });

    console.log(`Extracted ${stats.length} players stats total.`);
    if (stats.length > 0) {
        console.table(stats.slice(0, 5));
    } else {
        console.log("FIRST TABLE HTML SNIPPET:");
        console.log($("table.wf-table-inset.mod-overview").first().html()?.substring(0, 1000));
    }
}

testLocalScraper();
