const fs = require("node:fs/promises");
const path = require("node:path");
const cheerio = require("cheerio");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const apply = process.argv.includes("--apply");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const playerAliases = {
  al0rante: "alorante.webp",
  cryocells: "cryo.webp",
  dantedeu5: "dante.webp",
  keznit: "keznitdeus.webp",
  klaus: "klaus1.webp",
  knight: "knightt.webp",
  "lovers rock": "loversrock.webp",
  purp0: "purpo.webp",
  spike: "spikezin.webp",
};

const localPlayerFallbacks = {
  al0rante: "al0rante.png",
  echo: "echo.png",
  "lovers rock": "loversrock.png",
  purp0: "purpo.png",
};

const localTeamFallbacks = {
  BBL: "BBL.png",
  FNC: "FNATIC.png",
  FNATIC: "FNATIC.png",
  FUT: "FUT.png",
  M8: "GentleMates.png",
  TH: "Heretics.png",
  KC: "KarmineCorp.png",
  NAVI: "NAVI.png",
  PCF: "PCIFIC.png",
  TL: "TeamLiquid.png",
  TEAMLIQUID: "TeamLiquid.png",
  VIT: "Vitality.png",
  VITALITY: "Vitality.png",
};

function slug(value) {
  return String(value || "asset")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function basenameFromUrl(value, fallback) {
  try {
    const candidate = new URL(value).pathname.split("/").pop();
    return candidate && candidate.includes(".") ? candidate : fallback;
  } catch {
    return fallback;
  }
}

function publicUrl(bucket, filename) {
  return supabase.storage.from(bucket).getPublicUrl(filename).data.publicUrl;
}

async function ensurePublicBucket(bucket) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data.some((entry) => entry.id === bucket)) return;
  if (!apply) return;
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/webp", "image/png"],
  });
  if (createError) throw createError;
}

async function listFiles(bucket) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) {
    if (!apply && /not found/i.test(error.message)) return new Set();
    throw error;
  }
  return new Set(data.map((entry) => entry.name));
}

async function downloadStored(bucket, filename) {
  const { data, error } = await supabase.storage.from(bucket).download(filename);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function fetchVlrPrimaryImage(kind, id) {
  const response = await fetch(`https://www.vlr.gg/${kind}/${id}`, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy media migration" },
  });
  if (!response.ok) throw new Error(`VLR ${kind}/${id} returned ${response.status}`);
  const $ = cheerio.load(await response.text());
  const src = $("img")
    .map((_, element) => $(element).attr("src"))
    .get()
    .find((value) => value && value.includes("owcdn.net"));
  if (!src) throw new Error(`No primary image found at VLR ${kind}/${id}`);
  const imageUrl = src.startsWith("//") ? `https:${src}` : src;
  const imageResponse = await fetch(imageUrl, {
    headers: { "user-agent": "Mozilla/5.0 VFantasy media migration" },
  });
  if (!imageResponse.ok) throw new Error(`${imageUrl} returned ${imageResponse.status}`);
  return Buffer.from(await imageResponse.arrayBuffer());
}

async function asWebp(buffer, kind) {
  const pipeline = sharp(buffer).rotate();
  if (kind === "team") {
    pipeline.resize(320, 320, {
      fit: "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  } else {
    pipeline.resize(400, 400, { fit: "contain", withoutEnlargement: true });
  }
  return pipeline.webp({ quality: 88, alphaQuality: 90 }).toBuffer();
}

async function upload(bucket, filename, buffer) {
  if (!apply) return;
  const { error } = await supabase.storage.from(bucket).upload(filename, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
}

async function repairPlayers(report) {
  const { data: players, error } = await supabase
    .from("pro_players")
    .select("id,nickname,vlr_id,photo_url")
    .order("nickname");
  if (error) throw error;

  const files = await listFiles("players");

  for (const player of players) {
    if (!player.photo_url && !player.vlr_id) continue;
    const filename = basenameFromUrl(player.photo_url, `${slug(player.nickname)}.webp`)
      .replace(/\.[^.]+$/, ".webp");
    let resolved = files.has(filename);

    try {
      if (!resolved && playerAliases[player.nickname.toLowerCase()] && files.has(playerAliases[player.nickname.toLowerCase()])) {
        const source = playerAliases[player.nickname.toLowerCase()];
        const buffer = await downloadStored("players", source);
        await upload("players", filename, await asWebp(buffer, "player"));
        resolved = true;
        report.playerAliasesCopied++;
      }

      if (!resolved && player.vlr_id) {
        const buffer = await fetchVlrPrimaryImage("player", player.vlr_id);
        await upload("players", filename, await asWebp(buffer, "player"));
        resolved = true;
        report.playerImagesFetched++;
      }

      const localFallback = localPlayerFallbacks[player.nickname.toLowerCase()];
      if (!resolved && localFallback) {
        const buffer = await fs.readFile(path.join(process.cwd(), "public", "players", localFallback));
        await upload("players", filename, await asWebp(buffer, "player"));
        resolved = true;
        report.playerLocalFallbacks++;
      }
    } catch (assetError) {
      report.warnings.push(`Player ${player.nickname}: ${assetError.message}`);
    }

    const nextUrl = resolved ? publicUrl("players", filename) : null;
    if (player.photo_url !== nextUrl) {
      report.playerRowsUpdated++;
      if (apply) {
        const { error: updateError } = await supabase
          .from("pro_players")
          .update({ photo_url: nextUrl })
          .eq("id", player.id);
        if (updateError) throw updateError;
      }
    }
  }
}

async function repairTeams(report) {
  await ensurePublicBucket("teams");
  const files = apply ? await listFiles("teams") : new Set();
  const { data: teams, error } = await supabase
    .from("pro_teams")
    .select("id,name,tag,vlr_id,logo_url")
    .order("name");
  if (error) throw error;

  for (const team of teams) {
    const filename = `${slug(team.tag || team.name)}.webp`;
    let resolved = files.has(filename);

    try {
      if (!resolved && team.vlr_id) {
        const buffer = await fetchVlrPrimaryImage("team", team.vlr_id);
        await upload("teams", filename, await asWebp(buffer, "team"));
        resolved = true;
        report.teamImagesFetched++;
      }

      const localName = localTeamFallbacks[String(team.tag || "").toUpperCase()]
        || localTeamFallbacks[String(team.name || "").toUpperCase()];
      if (!resolved && localName) {
        const buffer = await fs.readFile(path.join(process.cwd(), "public", "equipos", localName));
        await upload("teams", filename, await asWebp(buffer, "team"));
        resolved = true;
        report.teamLocalFallbacks++;
      }
    } catch (assetError) {
      report.warnings.push(`Team ${team.name}: ${assetError.message}`);
    }

    const nextUrl = resolved ? publicUrl("teams", filename) : null;
    if (team.logo_url !== nextUrl) {
      report.teamRowsUpdated++;
      if (apply) {
        const { error: updateError } = await supabase
          .from("pro_teams")
          .update({ logo_url: nextUrl })
          .eq("id", team.id);
        if (updateError) throw updateError;
      }
    }
  }
}

async function main() {
  const report = {
    mode: apply ? "apply" : "dry-run",
    playerRowsUpdated: 0,
    playerAliasesCopied: 0,
    playerImagesFetched: 0,
    playerLocalFallbacks: 0,
    teamRowsUpdated: 0,
    teamImagesFetched: 0,
    teamLocalFallbacks: 0,
    warnings: [],
  };

  await repairPlayers(report);
  await repairTeams(report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
