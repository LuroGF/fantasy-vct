"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { getServerTranslator } from "@/lib/i18n/server";

const DAILY_BONUS_AMOUNT = 500_000;

type DailyBonusStatus = {
  canClaim: boolean;
  rewardAmount: number;
  eligibleLeagues: number;
  claimedAt: string | null;
  nextAvailableAt: string | null;
};

type DailyBonusStatusRow = {
  can_claim: boolean;
  reward_amount: number | string;
  eligible_leagues: number;
  claimed_at: string | null;
  next_available_at: string | null;
};

type DailyBonusClaimRow = {
  claimed: boolean;
  amount_per_league: number | string;
  leagues_rewarded: number;
  total_awarded: number | string;
  claimed_at: string | null;
};

const EMPTY_STATUS: DailyBonusStatus = {
  canClaim: false,
  rewardAmount: DAILY_BONUS_AMOUNT,
  eligibleLeagues: 0,
  claimedAt: null,
  nextAvailableAt: null,
};

export async function getBonusStatus(): Promise<DailyBonusStatus> {
  const session = await getSession();
  if (!session) return EMPTY_STATUS;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_bonus_status");

  if (error) {
    console.error("Error fetching daily bonus status:", error);
    return EMPTY_STATUS;
  }

  const row = (Array.isArray(data) ? data[0] : data) as DailyBonusStatusRow | null;
  if (!row) return EMPTY_STATUS;

  return {
    canClaim: Boolean(row.can_claim),
    rewardAmount: Number(row.reward_amount) || DAILY_BONUS_AMOUNT,
    eligibleLeagues: Number(row.eligible_leagues) || 0,
    claimedAt: row.claimed_at,
    nextAvailableAt: row.next_available_at,
  };
}

export async function claimDailyBonus() {
  const { t } = await getServerTranslator();
  const session = await getSession();
  if (!session) return { success: false, error: t("system.unauthorized") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_daily_bonus");

  if (error) {
    console.error("Error claiming daily bonus:", error);
    return {
      success: false,
      error: t("system.claimFailed"),
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as DailyBonusClaimRow | null;
  if (!row?.claimed) {
    return {
      success: false,
      error: t("system.alreadyClaimed"),
    };
  }

  const leaguesRewarded = Number(row.leagues_rewarded) || 0;
  const totalAwarded = Number(row.total_awarded) || 0;

  revalidatePath("/dashboard");
  revalidatePath("/market");
  revalidatePath("/team");

  return {
    success: true,
    amountPerLeague: Number(row.amount_per_league) || DAILY_BONUS_AMOUNT,
    leaguesRewarded,
    totalAwarded,
    claimedAt: row.claimed_at,
    message:
      leaguesRewarded === 1
        ? t("system.rewardOneLeague")
        : t("system.rewardMultipleLeagues", { count: leaguesRewarded }),
  };
}
