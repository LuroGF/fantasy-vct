import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/actions/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const supabase = await createClient();

    // Guardar suscripción en la base de datos
    // Usamos upsert basado en el endpoint para evitar duplicados del mismo dispositivo
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error("Error saving subscription:", error);
      return NextResponse.json({ error: "Error al guardar la suscripción" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
