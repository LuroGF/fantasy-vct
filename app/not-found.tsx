import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerTranslator();
  return (
    <main className="relative min-h-dvh overflow-hidden bg-v-navy px-6 text-v-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,70,85,0.14),transparent_55%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-v-red">{t("system.error404")}</p>
        <h1 className="mt-4 text-6xl font-black italic uppercase tracking-tighter sm:text-8xl">
          {t("system.outOfMap")}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-6 text-v-white/60">
          {t("system.notFound")}
        </p>
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="v-btn-primary flex-1 py-4 text-sm">
            {t("system.goHome")}
          </Link>
          <Link href="/" className="v-btn-secondary flex-1 py-4 text-sm">
            {t("system.landing")}
          </Link>
        </div>
      </div>
    </main>
  );
}
