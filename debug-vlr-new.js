const cheerio = require("cheerio");

async function debugVlr(matchId) {
    const url = `https://www.vlr.gg/${matchId}`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const tables = $("table.wf-table-inset.mod-overview");
    console.log(`Found ${tables.length} tables`);
    
    tables.each((i, table) => {
        console.log(`\nTable ${i}:`);
        const rows = $(table).find("tr");
        
        rows.each((j, row) => {
            const tds = $(row).find("td");
            if (tds.length === 0) return;

            const playerCell = $(tds[0]);
            const playerInfo = playerCell.find(".mod-player");
            const nickname = playerCell.find(".text-of").text().trim() || 
                             playerInfo.text().trim().split("\n")[0].trim();
            const playerLink = playerCell.find("a").attr("href") || "";
            const playerId = playerLink.split("/")[2] || "";
            const teamTag = playerInfo.find(".ge-text-light").text().trim();

            console.log(`Row ${j}: Nick: "${nickname}" | ID: ${playerId} | Tag: "${teamTag}"`);
            
            // If tag is empty, dump the html of playerInfo
            if (!teamTag) {
                console.log(`  DEBUG playerInfo HTML: ${playerInfo.html()}`);
            }
        });
    });
}

debugVlr("594761");
