const cheerio = require("cheerio");

const playerIds = process.argv.slice(2);

if (playerIds.length === 0 || playerIds.some((id) => !/^\d+$/.test(id))) {
  console.error("Usage: node scripts/audit-vlr-player-pages.cjs <numeric-id> [...]");
  process.exit(1);
}

async function inspectPlayer(playerId) {
  const requestedUrl = `https://www.vlr.gg/player/${playerId}`;
  const response = await fetch(requestedUrl, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy VLR mapping audit" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${playerId}: VLR returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const pageTitle = $("title").text().replace(/\s+/g, " ").trim();
  const heading = $("h1, .player-header h1, .wf-title-med")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const realName = $(".player-real-name, .player-header-desc")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const currentTeams = [];

  $('a[href*="/team/"]').each((_, element) => {
    const label = $(element).text().replace(/\s+/g, " ").trim();
    if (label && !currentTeams.includes(label)) currentTeams.push(label);
  });

  return {
    id: playerId,
    requestedUrl,
    finalUrl: response.url,
    pageTitle,
    heading,
    realName,
    currentTeams,
  };
}

async function main() {
  const results = [];
  for (const playerId of playerIds) results.push(await inspectPlayer(playerId));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
