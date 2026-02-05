import Link from "next/link";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-2">
         <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
         </Link>
         <h1 className="text-4xl leading-none italic uppercase">Avisos</h1>
      </div>

      <div className="v-panel p-12 text-center opacity-40 italic">
         <p className="text-sm">No tienes comunicaciones tácticas pendientes.</p>
      </div>
    </div>
  );
}
