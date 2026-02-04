import * as cheerio from 'cheerio';

async function test() {
    const VLR_STATS_URL = "https://www.vlr.gg/stats/?event_group_id=all&event_id=all&region=eu&country=all&min_rounds=100&min_rating=0&agent_id=all&timespan=180d";
    const EMEA_TIER1_TEAMS = ["FNC", "VIT", "TH", "KC", "NAVI", "BBL", "FUT", "GX", "KOI", "TL", "M8"];

    console.log("Fetching " + VLR_STATS_URL);
    const response = await fetch(VLR_STATS_URL, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const players = [];

    $(".wf-table tbody tr").each((i, el) => {
        const row = $(el);
        const nickname = row.find(".text-of").first().text().trim();
        const teamTag = row.find(".stats-player-country").first().text().trim().toUpperCase();
        
        if (i < 10) {
            console.log(`Found: [${nickname}] with tag [${teamTag}]`);
        }

        if (nickname && teamTag && nickname !== "" && EMEA_TIER1_TEAMS.includes(teamTag)) {
            players.push({ nickname, teamTag });
        }
    });

    console.log("\nTotal players found after filter: " + players.length);
    if (players.length > 0) {
        console.log("Sample filtered players:", players.slice(0, 5));
    }
}

test();
