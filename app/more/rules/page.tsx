import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function RulesPage() {
  const { locale, t } = await getServerTranslator();
  const numberLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "es-ES";
  const euroFormatter = new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const scoringRules = [
    { label: t("rules.kill"), points: "+2 pts" },
    { label: t("rules.death"), points: "-1 pt" },
    { label: t("rules.assist"), points: "+1 pt" },
    { label: t("rules.clutch"), points: "+3 pts" },
    { label: t("rules.firstBlood"), points: "+2 pts" },
    { label: t("rules.firstDeath"), points: "-1 pt" },
    { label: t("rules.acs300"), points: "+5 pts" },
    { label: t("rules.acs250"), points: "+3 pts" },
    { label: t("rules.acs200"), points: "+1 pt" },
    { label: t("rules.acs150"), points: "0 pts" },
    { label: t("rules.acsLow"), points: "-1 pt" },
    { label: t("rules.mvp"), points: "+5 pts" },
  ];

  const gameweekRewards = [
    { label: t("rules.firstPlace"), amount: euroFormatter.format(2_000_000) },
    { label: t("rules.secondPlace"), amount: euroFormatter.format(1_250_000) },
    { label: t("rules.thirdPlace"), amount: euroFormatter.format(750_000) },
    { label: t("rules.fourthOnward"), amount: euroFormatter.format(500_000) },
  ];

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
          <h1 className="text-4xl leading-none italic uppercase">{t("rules.title")}</h1>
        </div>
      </Link>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">
            {t("rules.scoring")}
          </h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            {t("rules.scoringDescription")}
          </p>
        </div>

        <div className="grid gap-2">
          {scoringRules.map((rule) => (
            <div
              key={rule.label}
              className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10 hover:border-v-red transition-all"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {rule.label}
              </span>
              <span className="text-sm font-black italic text-v-red">
                {rule.points}
              </span>
            </div>
          ))}
        </div>

        <div className="v-panel border-white/5 bg-v-white/5 p-4 mt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-v-red mb-2">
            {t("rules.pointsUpdate")}
          </p>
          <p className="text-[10px] text-v-white/40 leading-relaxed italic">
            {t("rules.pointsUpdateDescription")}
          </p>
        </div>
      </div>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">
            {t("rules.rewards")}
          </h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            {t("rules.rewardsDescription")}
          </p>
        </div>

        <div className="grid gap-2">
          {gameweekRewards.map((reward) => (
            <div
              key={reward.label}
              className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {reward.label}
              </span>
              <span className="text-sm font-black italic text-v-red">
                {reward.amount}
              </span>
            </div>
          ))}
        </div>

        <div className="border border-white/5 bg-v-white/5 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-v-red">
            {t("rules.dailyActivity")}
          </p>
          <p className="text-[10px] text-v-white/40 leading-relaxed italic">
            {t("rules.dailyDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
