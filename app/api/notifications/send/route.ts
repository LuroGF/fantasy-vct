import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: Request) {
  try {
    // Only allow internal server calls (cron or server actions)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Configurar web-push dentro del handler para evitar errores en build time
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@fantasyvct.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    const body = await req.json();
    const { userId, title, body: msgBody, url, tag } = body;

    // Basic validation - userId and title are required
    if (!userId || typeof userId !== 'string' || !title || typeof title !== 'string') {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const supabase = await createClient();

    // Obtener todas las suscripciones de este usuario (puede tener varios dispositivos)
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error || !subscriptions) {
      return NextResponse.json({ error: "No se encontraron suscripciones" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body: msgBody,
      url: url || '/dashboard',
      tag: tag || 'general'
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { endpoint: sub.endpoint, status: 'sent' };
        } catch (err: any) {
          // Si la suscripción ha expirado o es inválida, eliminarla de la BD
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            return { endpoint: sub.endpoint, status: 'deleted' };
          }
          return { endpoint: sub.endpoint, status: 'failed', error: err.message };
        }
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
