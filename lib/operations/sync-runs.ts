import "server-only";

import { supabaseAdmin } from "@/utils/supabase/admin";

export type VctSyncType = "matches" | "stats";
export type VctSyncStatus = "success" | "warning" | "failed";

function safeErrors(errors: string[]) {
  return errors.slice(0, 100).map((error) => error.slice(0, 1_000));
}

export async function startVctSyncRun(syncType: VctSyncType) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc("try_start_vct_sync_run", { p_sync_type: syncType });

    if (error) {
      console.error("Could not start VLR sync run log:", error);
      return null;
    }

    return data ? String(data) : null;
  } catch (error) {
    console.error("Could not start VLR sync run log:", error);
    return null;
  }
}

export async function finishVctSyncRun(
  runId: string | null,
  status: VctSyncStatus,
  summary: Record<string, number | string | boolean | null>,
  errors: string[] = [],
) {
  if (!runId) return;

  try {
    const { error } = await supabaseAdmin.rpc("finish_vct_sync_run", {
      p_run_id: runId,
      p_status: status,
      p_summary: summary,
      p_errors: safeErrors(errors),
    });

    if (error) console.error("Could not finish VLR sync run log:", error);
  } catch (error) {
    console.error("Could not finish VLR sync run log:", error);
  }
}

export function syncErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown synchronization error";
}
