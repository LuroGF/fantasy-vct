import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

const faqSections: { title: MessageKey; items: { question: MessageKey; answer: MessageKey }[] }[] = [
  {
    title: "support.gettingStarted",
    items: [
      { question: "support.startQ", answer: "support.startA" },
      { question: "support.competitionsQ", answer: "support.competitionsA" },
      { question: "support.multipleLeaguesQ", answer: "support.multipleLeaguesA" },
    ],
  },
  {
    title: "support.squadGameweeks",
    items: [
      { question: "support.whoScoresQ", answer: "support.whoScoresA" },
      { question: "support.lineupChangesQ", answer: "support.lineupChangesA" },
      { question: "support.substituteQ", answer: "support.substituteA" },
      { question: "support.otherPointsQ", answer: "support.otherPointsA" },
    ],
  },
  {
    title: "support.market",
    items: [
      { question: "support.bidsQ", answer: "support.bidsA" },
      { question: "support.balanceQ", answer: "support.balanceA" },
      { question: "support.clauseQ", answer: "support.clauseA" },
      { question: "support.missingPlayerQ", answer: "support.missingPlayerA" },
    ],
  },
  {
    title: "support.pointsMoneyAlerts",
    items: [
      { question: "support.scoringQ", answer: "support.scoringA" },
      { question: "support.dailyQ", answer: "support.dailyA" },
      { question: "support.notificationsQ", answer: "support.notificationsA" },
      { question: "support.changesQ", answer: "support.changesA" },
    ],
  },
];

export default async function SupportPage() {
  const { t } = await getServerTranslator();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/more"
          aria-label={t("community.backMore")}
          className="text-v-white/20 transition-colors hover:text-v-white"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-4xl leading-none italic uppercase">{t("support.title")}</h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-v-red">
            {t("support.faq")}
          </p>
        </div>
      </div>

      <div className="v-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black italic uppercase">{t("support.exactFormula")}</p>
          <p className="mt-1 text-xs leading-relaxed text-v-white/45">
            {t("support.formulaDescription")}
          </p>
        </div>
        <Link href="/more/rules" className="v-btn-secondary shrink-0 px-5 py-3 text-[9px]">
          {t("support.viewRules")}
        </Link>
      </div>

      {faqSections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-black italic uppercase tracking-tight text-v-white">
            {t(section.title)}
          </h2>
          <div className="v-panel divide-y divide-white/5 overflow-hidden">
            {section.items.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-left text-[11px] font-black uppercase tracking-wide text-v-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-v-red">
                  {t(item.question)}
                  <span className="shrink-0 text-lg text-v-red transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-5 text-xs leading-6 text-v-white/50">
                  {t(item.answer)}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="border border-white/5 bg-white/[0.025] p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-v-white/35">
          {t("support.privateBeta")}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-v-white/45">
          {t("support.betaDescription")}
        </p>
      </div>
    </div>
  );
}
