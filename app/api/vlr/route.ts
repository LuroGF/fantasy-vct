import { NextResponse } from "next/server";

import {
  getVlrMatches,
  getVlrMatchDetails,
} from "@/lib/vlr";

export async function GET(
  request: Request,
) {
  const authHeader =
    request.headers.get(
      "authorization",
    );

  const expectedSecret =
    process.env.CRON_SECRET;

  if (
    !expectedSecret ||
    authHeader !==
      `Bearer ${expectedSecret}`
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

  const { searchParams } =
    new URL(request.url);

  const matchId =
    searchParams.get("id");

  try {
    // ======================================================
    // DETALLE DE UN PARTIDO
    // ======================================================

    if (matchId) {
      const details =
        await getVlrMatchDetails(
          matchId,
        );

      if (!details) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Match details not available",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        success: true,
        data: details,
      });
    }

    // ======================================================
    // LISTADO GENERAL DE PARTIDOS
    // ======================================================

    const matches =
      await getVlrMatches();

    return NextResponse.json({
      success: true,
      matches,
    });
  } catch (error) {
    console.error(
      "VLR API route failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se han podido sincronizar los partidos.",
      },
      {
        status: 500,
      },
    );
  }
}
