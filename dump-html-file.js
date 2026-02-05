const cheerio = require("cheerio");
const fs = require("fs");

async function dumpHtml(matchId) {
    const url = `https://www.vlr.gg/${matchId}`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    const $ = cheerio.load(html);
    const firstTd = $("table.wf-table-inset.mod-overview").first().find("tr").eq(1).find("td").first();
    fs.writeFileSync("td0.html", firstTd.html());
    console.log("Wrote td0.html");
}

dumpHtml("594761");
