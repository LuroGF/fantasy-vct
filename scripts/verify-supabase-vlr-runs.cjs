const path = require("node:path");

require("dotenv").config({
  path: path.join(process.cwd(), ".env.local"),
  quiet: true,
});

const { createClient } = require("@supabase/supabase-js");

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const [runs, locks] = await Promise.all([
    supabase
      .from("vct_sync_runs")
      .select("sync_type,status,started_at,finished_at,summary,errors")
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("vct_sync_locks")
      .select("sync_type,locked_until,updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  if (runs.error) throw runs.error;
  if (locks.error) throw locks.error;

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        activeLocks: locks.data ?? [],
        runs: runs.data ?? [],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
