import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { dispatchPendingPushNotifications } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const authHeader =
    request.headers.get("authorization");

  const secret =
    process.env.CRON_SECRET;

  if (
    !secret ||
    authHeader !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    /*
     * La sincronización VLR se realiza ahora
     * mediante:
     *
     * /api/admin/sync-vlr-matches
     * /api/admin/sync-vlr-stats
     *
     * Este cron únicamente ejecuta los
     * motores internos de Supabase.
     */

    const {
      data: gameweekResult,
      error: gameweekError,
    } = await (supabaseAdmin as any).rpc(
      "run_gameweek_engine",
    );

    if (gameweekError) {
      throw new Error(
        `Gameweek engine: ${gameweekError.message}`,
      );
    }

    const {
      data: rewardResult,
      error: rewardError,
    } = await (supabaseAdmin as any).rpc(
      "settle_finished_gameweek_rewards",
    );

    if (rewardError) {
      throw new Error(
        `Gameweek rewards: ${rewardError.message}`,
      );
    }

    const {
      data: marketResult,
      error: marketError,
    } = await (supabaseAdmin as any).rpc(
      "run_vct_2027_daily_market_engine",
    );

    if (marketError) {
      throw new Error(
        `Market engine: ${marketError.message}`,
      );
    }

    const {
      data: marketNotifications,
      error: marketNotificationsError,
    } = await (supabaseAdmin as any).rpc(
      "enqueue_market_result_notifications",
    );

    if (marketNotificationsError) {
      throw new Error(
        `Market notifications: ${marketNotificationsError.message}`,
      );
    }

    const pushResult =
      await dispatchPendingPushNotifications(25);

    return NextResponse.json({
      success: true,
      gameweek: gameweekResult,
      rewards: rewardResult,
      market: marketResult,
      marketNotifications:
        Number(marketNotifications) || 0,
      push: pushResult,
    });
  } catch (error) {
    console.error(
      "Cron sync-scores error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se ha podido completar la sincronización.",
      },
      {
        status: 500,
      },
    );
  }
}
