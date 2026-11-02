const cheerio = require("cheerio");

const playerNames = process.argv.slice(2);

if (playerNames.length === 0) {
  console.error('Usage: node scripts/audit-vlr-player-ids.cjs "Nickname" [...]');
  process.exit(1);
}

async function findPlayerCandidates(playerName) {
  const url = `https://www.vlr.gg/search/?q=${encodeURIComponent(playerName)}`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy VLR mapping audit" },
  });

  if (!response.ok) {
    throw new Error(`${playerName}: VLR search returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const candidates = [];

  $('a[href*="/player/"]').each((_, element) => {
    const href = $(element).attr("href");
    const label = $(element).text().replace(/\s+/g, " ").trim();
    const match = href?.match(/\/player\/(\d+)(?:\/([^/?#]+))?/);

    if (!match) return;

    candidates.push({
      id: match[1],
      slug: match[2] || null,
      label,
      url: `https://www.vlr.gg/player/${match[1]}`,
    });
  });

  return { playerName, candidates };
}

async function main() {
  const results = [];
  for (const playerName of playerNames) {
    results.push(await findPlayerCandidates(playerName));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
