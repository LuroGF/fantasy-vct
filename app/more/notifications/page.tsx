import Link from "next/link";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getUserNotifications, markAllAsRead } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const notifications = await getUserNotifications(session.user.id);

  async function handleMarkAllAsRead() {
    "use server";
    await markAllAsRead(session!.user.id);
    revalidatePath("/more/notifications");
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-4xl leading-none italic uppercase">Avisos</h1>
        </div>
        
        {notifications.length > 0 && (
            <form action={handleMarkAllAsRead}>
                <button type="submit" className="text-[10px] font-black uppercase text-v-red tracking-widest hover:underline">
                    Marcar todo como leído
                </button>
            </form>
        )}
      </div>

      <div className="grid gap-3">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={`v-panel p-4 border-l-2 ${n.is_read ? "border-v-white/10 opacity-60" : "border-v-red bg-v-red/5"}`}
          >
            <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-black uppercase italic tracking-tight">{n.title}</h3>
                <span className="text-[8px] text-v-white/30 uppercase font-black">
                    {new Date(n.created_at).toLocaleDateString()}
                </span>
            </div>
            <p className="text-xs text-v-white/60 leading-relaxed">{n.message}</p>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="v-panel p-12 text-center opacity-40 italic border-dashed border-2 border-white/5">
           <p className="text-sm">No tienes comunicaciones tácticas pendientes.</p>
        </div>
      )}
    </div>
  );
}
