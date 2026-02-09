import { fetchVlrMatches } from './lib/vlr'

async function testFetch() {
    console.log("Fetching matches from VLR...");
    try {
        const data = await fetchVlrMatches();
        console.log(`Found ${data.upcomingMatches.length} emea matches:`);
        data.upcomingMatches.forEach(m => {
            console.log(`- ${m.teams} | Event: ${m.event} | Date: ${m.date} | VLR ID: ${m.id}`);
        });
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testFetch();
