const { scrapeMatchDetails, calculateFantasyPoints } = require('./lib/vlr');

async function test() {
    console.log("Testing scraper for PCIFIC match (594753)...");
    const result = await scrapeMatchDetails("594753");
    
    if (!result || !result.stats || result.stats.length === 0) {
        console.error("FAILED: No stats found for 594753");
        return;
    }

    const stats = result.stats;
    console.log(`SUCCESS: Found ${stats.length} players. Match status: ${result.status}`);
    stats.slice(0, 3).forEach(p => {
        const points = calculateFantasyPoints(p);
        console.log(`Player: ${p.nickname} | Tag: "${p.teamTag}" | Points: ${points}`);
    });
}

test();
