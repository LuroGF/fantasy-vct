import Link from "next/link";

export function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <article className="v-panel space-y-8 p-6 sm:p-8">
        <header>
          <h1 className="text-4xl leading-none italic uppercase">{title}</h1>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-v-red">
            {subtitle}
          </p>
          <p className="mt-3 text-xs text-v-white/35">Versión provisional · 3 de noviembre de 2026</p>
        </header>

        <div className="space-y-7 text-sm leading-relaxed text-v-white/70 [&_h2]:text-xl [&_h2]:font-black [&_h2]:italic [&_h2]:uppercase [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-v-white">
          {children}
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[10px] font-black uppercase tracking-wider text-v-white/45">
          <Link href="/aviso-legal" className="hover:text-v-red">Aviso legal</Link>
          <Link href="/privacidad" className="hover:text-v-red">Privacidad</Link>
          <Link href="/terminos" className="hover:text-v-red">Términos</Link>
          <Link href="/cookies" className="hover:text-v-red">Cookies</Link>
        </nav>
      </article>
    </div>
  );
}
