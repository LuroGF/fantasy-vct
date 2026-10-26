import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { dispatchPendingPushNotifications } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  const run = async (name: string) => {
    const { data, error } = await (supabaseAdmin as any).rpc(name);
    if (error) errors.push(`${name}: ${error.message}`);
    return Number(data) || 0;
  };

  const gameweekReminders = await run("enqueue_gameweek_reminders");
  const dailyRewards = await run("enqueue_daily_reward_reminders");
  const marketResults = await run("enqueue_market_result_notifications");

  let push = { processed: 0, sent: 0 };
  try {
    push = await dispatchPendingPushNotifications();
  } catch (error) {
    errors.push(`push: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    created: { gameweekReminders, dailyRewards, marketResults },
    push,
    errors,
  });
}
