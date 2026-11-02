const cheerio = require("cheerio");

const teamNames = process.argv.slice(2);

if (teamNames.length === 0) {
  console.error('Usage: node scripts/audit-vlr-team-ids.cjs "Team name" [...]');
  process.exit(1);
}

async function findTeamCandidates(teamName) {
  const url = `https://www.vlr.gg/search/?q=${encodeURIComponent(teamName)}`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy VLR mapping audit" },
  });

  if (!response.ok) {
    throw new Error(`${teamName}: VLR search returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const candidates = [];

  $('a[href*="/team/"]').each((_, element) => {
    const href = $(element).attr("href");
    const label = $(element).text().replace(/\s+/g, " ").trim();
    const match = href?.match(/\/team\/(\d+)(?:\/([^/?#]+))?/);

    if (!match) return;

    candidates.push({
      id: match[1],
      slug: match[2] || null,
      label,
      url: `https://www.vlr.gg/team/${match[1]}`,
    });
  });

  return { teamName, candidates };
}

async function main() {
  const results = [];

  for (const teamName of teamNames) {
    results.push(await findTeamCandidates(teamName));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
