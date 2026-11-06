"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Lightbulb,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";

import { useLocale } from "@/components/LocaleProvider";
import { setOnboardingStatus, type OnboardingStatus } from "@/lib/actions/onboarding";
import type { MessageKey } from "@/lib/i18n/messages";
import { haptic } from "@/lib/utils/haptics";

type TutorialStep = {
  icon: ComponentType<{ className?: string }>;
  title: MessageKey;
  description: MessageKey;
  tip: MessageKey;
  href?: string;
  section?: MessageKey;
};

const subscribeToClient = () => () => {};

export function OnboardingTutorial({ autoOpen }: { autoOpen: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(autoOpen);
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [manualReplay, setManualReplay] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const steps: TutorialStep[] = [
    {
      icon: Trophy,
      title: "dashboard.tutorialWelcomeTitle",
      description: "dashboard.tutorialWelcomeDescription",
      tip: "dashboard.tutorialWelcomeTip",
    },
    {
      icon: Users,
      title: "dashboard.tutorialLeagueTitle",
      description: "dashboard.tutorialLeagueDescription",
      tip: "dashboard.tutorialLeagueTip",
      href: "/leagues",
      section: "dashboard.tutorialLeagueSection",
    },
    {
      icon: ShieldCheck,
      title: "dashboard.tutorialTeamTitle",
      description: "dashboard.tutorialTeamDescription",
      tip: "dashboard.tutorialTeamTip",
      href: "/team",
      section: "dashboard.tutorialTeamSection",
    },
    {
      icon: ShoppingCart,
      title: "dashboard.tutorialMarketTitle",
      description: "dashboard.tutorialMarketDescription",
      tip: "dashboard.tutorialMarketTip",
      href: "/market",
      section: "dashboard.tutorialMarketSection",
    },
    {
      icon: Bell,
      title: "dashboard.tutorialAlertsTitle",
      description: "dashboard.tutorialAlertsDescription",
      tip: "dashboard.tutorialAlertsTip",
      href: "/more/notifications",
      section: "dashboard.tutorialAlertsSection",
    },
  ];

  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 120);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, stepIndex]);

  function openTutorial() {
    haptic.light();
    setStepIndex(0);
    setError(null);
    setManualReplay(true);
    setOpen(true);
  }

  async function closeTutorial(status: OnboardingStatus) {
    if (manualReplay) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await setOnboardingStatus(status);
    setSaving(false);

    if (!result.success) {
      haptic.error();
      setError(result.error || t("dashboard.tutorialSaveFailed"));
      return;
    }

    haptic.success();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openTutorial}
        aria-label={t("dashboard.tutorialOpen")}
        className="inline-flex shrink-0 items-center gap-2 border border-white/10 bg-white/5 p-2 text-[9px] font-black uppercase tracking-[0.16em] text-v-white/65 transition hover:border-v-red/40 hover:text-v-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red sm:px-3"
      >
        <CircleHelp className="h-4 w-4 text-v-red" />
        <span className="hidden sm:inline">{t("dashboard.tutorialOpen")}</span>
      </button>

      {mounted ? createPortal(<AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-title"
              className="relative max-h-[calc(100dvh-4rem)] w-full overflow-y-auto border border-white/10 bg-[#101010] shadow-2xl sm:max-h-[90dvh] sm:max-w-2xl"
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-1 bg-v-red" />
              <div className="p-5 sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-v-red">
                      {t("dashboard.tutorialEyebrow")}
                    </p>
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-v-white/30">
                      {t("dashboard.tutorialStep", { current: stepIndex + 1, total: steps.length })}
                    </p>
                  </div>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {steps.map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 transition-all ${index === stepIndex ? "w-8 bg-v-red" : index < stepIndex ? "w-4 bg-v-red/45" : "w-4 bg-white/10"}`}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={stepIndex}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.16 }}
                    className="py-7 sm:py-10"
                  >
                    <div className="mb-6 flex h-16 w-16 items-center justify-center border border-v-red/30 bg-v-red/10 text-v-red">
                      <StepIcon className="h-8 w-8" />
                    </div>
                    <h2 id="tutorial-title" className="max-w-xl text-3xl leading-none sm:text-4xl">
                      {t(step.title)}
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-v-white/60 sm:text-base">
                      {t(step.description)}
                    </p>
                    <div className="mt-6 flex gap-3 border-l-2 border-v-red/50 bg-white/[0.03] p-4">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-v-red" />
                      <p className="text-xs leading-5 text-v-white/50">{t(step.tip)}</p>
                    </div>
                    {step.href && step.section ? (
                      <Link
                        href={step.href}
                        className="mt-5 inline-flex text-[9px] font-black uppercase tracking-[0.18em] text-v-red hover:text-white"
                      >
                        {t("dashboard.tutorialGoTo", { section: t(step.section) })}
                      </Link>
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                {error ? (
                  <p role="alert" className="mb-4 border border-v-red/30 bg-v-red/10 p-3 text-xs text-v-red">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void closeTutorial("skipped")}
                    className="px-2 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-v-white/35 transition hover:text-v-white disabled:opacity-40"
                  >
                    {manualReplay ? t("system.close") : t("dashboard.tutorialSkip")}
                  </button>

                  <div className="flex gap-3">
                    {stepIndex > 0 ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          haptic.light();
                          setStepIndex((current) => current - 1);
                        }}
                        className="v-btn-secondary inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-[9px] sm:flex-none"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t("dashboard.tutorialBack")}
                      </button>
                    ) : null}
                    <button
                      ref={primaryButtonRef}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (isLastStep) {
                          void closeTutorial("completed");
                          return;
                        }
                        haptic.light();
                        setStepIndex((current) => current + 1);
                      }}
                      className="v-btn-primary inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 text-[9px] disabled:opacity-50 sm:flex-none"
                    >
                      {saving
                        ? t("dashboard.tutorialSaving")
                        : isLastStep
                          ? t("dashboard.tutorialFinish")
                          : t("dashboard.tutorialNext")}
                      {!saving && !isLastStep ? <ChevronRight className="h-4 w-4" /> : null}
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>, document.body) : null}
    </>
  );
}
