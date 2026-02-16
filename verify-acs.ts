
import { scrapeMatchDetails } from "./lib/vlr";

async function test() {
  // Use a recent match ID (example ID, or I might need to find a valid one)
  // Let's try to scrape a match. If I don't have a specific ID, I might fail.
  // I'll try to find a recent ID or just use a placeholder if I can't.
  // Actually, I'll try to fetch recent results first if I can, but scrapeMatchDetails needs an ID.
  
  // I'll use a dummy ID that I know exists or is likely to exist or just fail and I'll see the error.
  // Better: I'll try to scrape a specific match URL I might have seen in logs? 
  // No logs available with IDs.
  
  // Let's try to just run it and see.
  // I will use a known recent VCT ID if I can guess one, or I'll search for one.
  // Actually, I'll just use the function 'getGenerico' if it existed, but it doesn't.
  
  console.log("Testing scraper...");
  // Random recent match ID from VLR (VCT EMEA Kickoff 2024 or similar)
  // ID: 419266 (Example)
  const matchId = "419266"; 

  try {
    console.log(`Scraping match ${matchId}...`);
    const result = await scrapeMatchDetails(matchId);
    
    if (!result) {
      console.log("No data returned");
      return;
    }

    const { stats: data, status } = result;

    console.log("Stats found:", data.length);
    console.log("Match status:", status);
    if (data.length > 0) {
      console.log("First player stats:", JSON.stringify(data[0], null, 2));
      const hasAcs = data.some(p => p.acs && p.acs > 0);
      console.log("Has ACS data:", hasAcs);
      
      // Check for MVP candidate
      const mvp = data.reduce((prev, current) => (prev.acs > current.acs) ? prev : current);
      console.log("Calculated MVP based on ACS:", mvp.nickname, mvp.acs);
    }
  } catch (error) {
    console.error("Detailed Error:", error);
  }
}

test();
