
import * as cheerio from "cheerio";

async function run() {
    console.log("--- Checking Attributes ---");
    let res = await fetch("https://www.vlr.gg/matches");
    let text = await res.text();
    let $ = cheerio.load(text);
    
    // Check first match item
    let item = $(".match-item").first();
    let html = item.html();
    // Check time element
    let timeItem = $(".match-item-time").first();
    console.log("Time Element Attributes:", timeItem.attr());
    console.log("Time Text:", timeItem.text().trim());

    // Also check detailed match page
    // Get link
    let link = item.attr("href");
    if (link) {
        console.log(`Checking match page: ${link}`);
        let mRes = await fetch(`https://www.vlr.gg${link}`);
        let mText = await mRes.text();
        let $m = cheerio.load(mText);
        
        let headerTime = $(".moment-tz-convert").first();
        console.log("Header Time Attributes:", headerTime.attr());
        console.log("Header Time Text:", headerTime.text().trim());
        
        // Also look for data-utc-ts in the header or scripts
    }
}

run();
