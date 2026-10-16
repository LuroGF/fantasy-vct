import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

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
      data: marketResult,
      error: marketError,
    } = await (supabaseAdmin as any).rpc(
      "run_daily_market_engine",
    );

    if (marketError) {
      throw new Error(
        `Market engine: ${marketError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      gameweek: gameweekResult,
      market: marketResult,
    });
  } catch (error) {
    console.error(
      "Cron sync-scores error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown cron error",
      },
      {
        status: 500,
      },
    );
  }
}