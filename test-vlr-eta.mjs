
import * as cheerio from "cheerio";

async function run() {
    console.log("--- Checking ETA ---");
    let res = await fetch("https://www.vlr.gg/matches");
    let text = await res.text();
    let $ = cheerio.load(text);
    
    // Check first match item
    let item = $(".match-item").first();
    let eta = item.find(".match-item-eta").text().trim();
    let time = item.find(".match-item-time").text().trim();
    
    console.log(`Time: ${time}`);
    console.log(`ETA: ${eta}`); // Should be like "2h 3m" or "LIVE"
    
    // Check if we can parse ETA
    if (eta && eta.includes('h')) {
        // e.g., "2h 3m from now"
        // parse it
    }
}

run();
