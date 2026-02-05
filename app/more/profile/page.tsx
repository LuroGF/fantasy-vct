import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-2">
         <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
         </Link>
         <h1 className="text-4xl leading-none italic uppercase">Perfil</h1>
      </div>

      <div className="v-panel p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-v-gray border-2 border-v-red flex items-center justify-center text-4xl font-black italic">
            {profile?.username?.[0] || "?"}
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">{profile?.username || "Cargando..."}</h2>
            <p className="text-[10px] font-black uppercase text-v-red tracking-widest">Agente de Nivel 1</p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/5 pt-6">
          <div className="space-y-1">
             <p className="text-[8px] font-black uppercase text-v-white/30">ID de Terminal</p>
             <p className="text-xs font-black italic text-v-white/80">{profile?.id}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-black uppercase text-v-white/30">Puntos Globales</p>
             <p className="text-xl font-black italic">{profile?.global_points?.toLocaleString() || 0}</p>
          </div>
        </div>

        <button className="v-btn-secondary w-full py-4 text-[10px] opacity-50 cursor-not-allowed">
          EDITAR CREDENCIALES (BLOQUEADO)
        </button>
      </div>
    </div>
  );
}
