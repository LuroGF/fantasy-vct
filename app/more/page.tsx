import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { NotificationBadge } from "@/components/NotificationBadge";
import { isCurrentUserAdmin } from "@/lib/admin/access";
import { getServerTranslator } from "@/lib/i18n/server";

const baseOptions = [
  { labelKey: "more.profile" as const, href: "/more/profile" },
  { labelKey: "more.performance" as const, href: "/stats" },
  { labelKey: "more.community" as const, href: "/more/community" },
  { labelKey: "more.notifications" as const, href: "/more/notifications" },
  { labelKey: "more.invite" as const, href: "/more/invite" },
  { labelKey: "more.rules" as const, href: "/more/rules" },
  { labelKey: "more.support" as const, href: "/more/support" },
  { labelKey: "more.privacyTerms" as const, href: "/privacidad" },
];

export default async function MorePage() {
  const { t } = await getServerTranslator();
  const isAdmin = await isCurrentUserAdmin();
  const options = isAdmin
    ? [...baseOptions, { labelKey: "more.operations" as const, href: "/more/operations" }]
    : baseOptions;

  return (
    // <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl py-4 flex flex-col gap-6 animate-in fade-in duration-700">
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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">{t("more.title")}</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">{t("more.subtitle")}</p>
        </div>
      </div>

      <div className="v-panel p-2 space-y-1 bg-v-gray/40">
        {options.map((item) => (
          <Link
            key={item.labelKey}
            href={item.href}
            className="w-full flex items-center justify-between p-4 hover:bg-v-white/5 transition-colors group border-b border-white/5 last:border-0"
          >
            <span className="text-sm font-black uppercase tracking-widest text-v-white/80">
              {t(item.labelKey)}
            </span>
            <span className="flex items-center gap-3">
              {item.href === "/more/notifications" && (
                <NotificationBadge variant="row" />
              )}
              <span className="text-v-white/20 group-hover:text-v-red transition-colors text-xl">
                {"//"}
              </span>
            </span>
          </Link>
        ))}
        
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center justify-between p-4 hover:bg-v-red/10 transition-colors group border-t cursor-pointer border-white/10"
          >
            <span className="text-sm font-black uppercase tracking-widest text-v-red">
              {t("more.logout")}
            </span>
            <span className="text-v-red/50 group-hover:text-v-red transition-colors text-xl">
              {"//"}
            </span>
          </button>
        </form>
      </div>

      <div className="text-center space-y-2 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">{"VCT Fantasy // 2027"}</p>
        <div className="flex justify-center gap-4">
          <div className="w-1 h-1 bg-v-red/20" />
          <div className="w-1 h-1 bg-v-red/50" />
          <div className="w-1 h-1 bg-v-red/20" />
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2 text-[9px] font-black uppercase tracking-wider text-v-white/30">
          <Link href="/aviso-legal" className="hover:text-v-red">{t("more.legalNotice")}</Link>
          <Link href="/privacidad" className="hover:text-v-red">{t("more.privacy")}</Link>
          <Link href="/terminos" className="hover:text-v-red">{t("more.terms")}</Link>
          <Link href="/cookies" className="hover:text-v-red">{t("more.cookies")}</Link>
        </div>
      </div>
    </div>
  );
}
