const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function test(tz) {
    const url = "https://www.vlr.gg/matches";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": `timezone=${tz}` // Try to set timezone
    };
    
    console.log(`Testing with timezone: ${tz}`);
    const res = await fetch(url, { headers });
    const text = await res.text();
    const $ = cheerio.load(text);
    
    // Find first match time
    const time = $(".match-item-time").first().text().trim();
    console.log(`First match time: ${time}`);
}

async function run() {
    await test('Etc/UTC'); // UTC
    await test('Europe/Madrid'); // CET/CEST
    await test('America/New_York'); // EST
}

run();
