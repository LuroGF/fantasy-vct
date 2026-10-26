import { NextResponse } from "next/server";
import { getSession } from "@/lib/actions/auth";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    // El endpoint pertenece al navegador, no a una cuenta concreta. Si el
    // usuario cambia de sesión en el mismo dispositivo, se reasigna después
    // de autenticar la nueva sesión para evitar que los avisos sigan llegando
    // a la cuenta anterior.
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get("user-agent"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) return NextResponse.json({ error: "Error al guardar la suscripción" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint inválido" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", session.user.id)
    .eq("endpoint", endpoint);

  if (error) return NextResponse.json({ error: "No se ha podido eliminar la suscripción" }, { status: 500 });
  return NextResponse.json({ success: true });
}
