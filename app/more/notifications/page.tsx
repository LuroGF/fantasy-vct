import Link from "next/link";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
} from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const notifications = await getUserNotifications(session.user.id);
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  async function handleMarkAllAsRead() {
    "use server";
    await markAllAsRead(session!.user.id);
    revalidatePath("/more/notifications");
  }

  async function handleMarkOneAsRead(notificationId: string) {
    "use server";
    await markNotificationAsRead(notificationId);
    revalidatePath("/more/notifications");
  }

  return (
    <div
      className="
  mx-auto
  w-full
  max-w-md sm:max-w-xl lg:max-w-4xl
  px-4 sm:px-6
  flex flex-col gap-8
  animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
"
    >
      <div className="flex items-center justify-between">
        <Link href="/more">
          <div className="flex items-center gap-2">
            <div className="text-v-white/20 hover:text-v-white transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
            <h1 className="text-4xl leading-none italic uppercase">Avisos</h1>
          </div>
        </Link>

        {unreadNotifications.length > 0 && (
          <form action={handleMarkAllAsRead}>
            <button
              type="submit"
              className="text-[10px] font-black uppercase text-v-red tracking-widest hover:underline"
            >
              Marcar todo como leído
            </button>
          </form>
        )}
      </div>

      {unreadNotifications.length > 0 && (
        <div className="v-panel p-3 border border-v-red/30 bg-v-red/10 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-v-red">
            {unreadNotifications.length} aviso
            {unreadNotifications.length > 1 ? "s" : ""} nuevo
            {unreadNotifications.length > 1 ? "s" : ""}
          </p>
          <p className="text-[9px] text-v-white/60">
            Revisa los marcados como NUEVO.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`v-panel p-4 border-l-2 ${n.is_read ? "border-v-white/10 opacity-60" : "border-v-red bg-v-red/5"}`}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase italic tracking-tight">
                  {n.title}
                </h3>
                {!n.is_read && (
                  <span className="text-[8px] px-2 py-0.5 rounded-sm bg-v-red text-white font-black uppercase tracking-widest">
                    Nuevo
                  </span>
                )}
              </div>
              <span className="text-[8px] text-v-white/30 uppercase font-black">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-v-white/60 leading-relaxed">
              {n.message}
            </p>
            {!n.is_read && (
              <form
                action={handleMarkOneAsRead.bind(null, n.id)}
                className="mt-3"
              >
                <button
                  type="submit"
                  className="text-[9px] font-black uppercase text-v-red tracking-wider hover:underline"
                >
                  Marcar como leído
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="v-panel p-12 text-center opacity-40 italic border-dashed border-2 border-white/5">
          <p className="text-sm">No tienes comunicaciones pendientes.</p>
        </div>
      )}
    </div>
  );
}
