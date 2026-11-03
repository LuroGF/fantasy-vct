const path = require("node:path");

require("dotenv").config({
  path: path.join(process.cwd(), ".env.local"),
  quiet: true,
});

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase OpenAPI request failed with ${response.status}`);
  }

  const schema = await response.json();
  const rpcNames = ["upsert_vlr_match", "upsert_vlr_player_performance"];
  const rpc = Object.fromEntries(
    rpcNames.map((name) => {
      const operation = schema.paths?.[`/rpc/${name}`]?.post ?? null;
      const body = operation?.parameters?.find(
        (parameter) => parameter.in === "body",
      );

      return [
        name,
        operation
          ? {
              exists: true,
              bodySchema: body?.schema ?? null,
              responseSchema:
                operation.responses?.["200"]?.schema ?? null,
            }
          : { exists: false },
      ];
    }),
  );

  const tableColumns = Object.fromEntries(
    ["matches", "player_performances"].map((table) => [
      table,
      Object.keys(schema.definitions?.[table]?.properties ?? {}),
    ]),
  );

  console.log(JSON.stringify({ rpc, tableColumns }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
