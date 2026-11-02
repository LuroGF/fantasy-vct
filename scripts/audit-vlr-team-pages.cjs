const cheerio = require("cheerio");

const teamIds = process.argv.slice(2);

if (teamIds.length === 0 || teamIds.some((id) => !/^\d+$/.test(id))) {
  console.error("Usage: node scripts/audit-vlr-team-pages.cjs <numeric-id> [...]");
  process.exit(1);
}

async function inspectTeam(teamId) {
  const requestedUrl = `https://www.vlr.gg/team/${teamId}`;
  const response = await fetch(requestedUrl, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy VLR mapping audit" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${teamId}: VLR returned HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const pageTitle = $("title").text().replace(/\s+/g, " ").trim();
  const heading = $("h1, .team-header-desc-name")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const country = $(".team-header-country")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const players = [];

  $('.team-roster-item a[href*="/player/"]').each((_, element) => {
    const label = $(element).text().replace(/\s+/g, " ").trim();
    const href = $(element).attr("href");
    const match = href?.match(/\/player\/(\d+)/);

    if (
      label &&
      match &&
      !players.some((player) => player.id === match[1])
    ) {
      players.push({ id: match[1], label });
    }
  });

  return {
    id: teamId,
    requestedUrl,
    finalUrl: response.url,
    pageTitle,
    heading,
    country,
    players,
  };
}

async function main() {
  const results = [];
  for (const teamId of teamIds) results.push(await inspectTeam(teamId));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
