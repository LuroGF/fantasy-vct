const cheerio = require("cheerio");

async function dumpHtml(matchId) {
    const url = `https://www.vlr.gg/${matchId}`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    const $ = cheerio.load(html);
    const firstTd = $("table.wf-table-inset.mod-overview").first().find("tr").eq(1).find("td").first();
    console.log(`FULL HTML of TD[0]:\n${firstTd.html()}`);
}

dumpHtml("594761");
