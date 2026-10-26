import { NextResponse } from "next/server";
import { sendPushToUser, type NotificationCategory } from "@/lib/notifications/push";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { userId, title, body, url, tag, category } = await req.json();
    if (!userId || typeof userId !== "string" || !title || typeof title !== "string") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const result = await sendPushToUser(
      userId,
      { title, body, url, tag },
      (category || "system") as NotificationCategory,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
