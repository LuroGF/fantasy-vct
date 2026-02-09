
import * as cheerio from "cheerio";

async function run() {
    
    // 1. No Cookie
    console.log("--- NO COOKIE ---");
    let res = await fetch("https://www.vlr.gg/matches");
    let text = await res.text();
    let $ = cheerio.load(text);
    let time = $(".match-item-time").first().text().trim();
    let teams = $(".match-item-vs-team-name").first().text().trim() + " vs " + $(".match-item-vs-team-name").eq(1).text().trim();
    console.log(`Time: ${time}, Teams: ${teams}`);

    // 2. Cookie: America/New_York
    console.log("--- COOKIE: America/New_York ---");
    res = await fetch("https://www.vlr.gg/matches", {
        headers: {
            "Cookie": "timezone=America/New_York; time_zone_offset=-300" // VLR uses 'timezone' cookie.
        }
    });
    text = await res.text();
    $ = cheerio.load(text);
    time = $(".match-item-time").first().text().trim();
    console.log(`Time: ${time}`);

    // 3. Cookie: Europe/Madrid
    console.log("--- COOKIE: Europe/Madrid ---");
    res = await fetch("https://www.vlr.gg/matches", {
        headers: {
            "Cookie": "timezone=Europe/Madrid; time_zone_offset=60" // VLR format might be tricky.
        }
    });
    text = await res.text();
    $ = cheerio.load(text);
    time = $(".match-item-time").first().text().trim();
    console.log(`Time: ${time}`);
}

run();
