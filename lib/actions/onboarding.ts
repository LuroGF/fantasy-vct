"use server";

import { revalidatePath } from "next/cache";

import { getServerTranslator } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import { getSession } from "./auth";

export type OnboardingStatus = "completed" | "skipped";

export async function setOnboardingStatus(status: OnboardingStatus) {
  const { t } = await getServerTranslator();
  const session = await getSession();

  if (!session) {
    return { success: false, error: t("system.unauthorized") };
  }

  if (status !== "completed" && status !== "skipped") {
    return { success: false, error: t("dashboard.tutorialSaveFailed") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_my_onboarding_status", {
    p_status: status,
  });

  if (error || !data?.success) {
    console.error("Error updating onboarding status:", error?.message || "Unexpected RPC response");
    return { success: false, error: t("dashboard.tutorialSaveFailed") };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
