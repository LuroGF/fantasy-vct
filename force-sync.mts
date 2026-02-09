import { fetchVlrMatches } from './lib/vlr'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function forceSync() {
    console.log("Triggering manual VLR sync (3 pages deep)...");
    try {
        const data = await fetchVlrMatches();
        console.log(`Successfully processed ${data.upcomingMatches.length} emea matches.`);
        console.log("Check the database now.");
    } catch (e) {
        console.error("Sync failed:", e);
    }
}

forceSync();
