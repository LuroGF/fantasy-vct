"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getBonusStatus(profileId: string) {
    const supabase = await createClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('last_bonus_claim_at')
        .eq('id', profileId)
        .single();
    
    if (!profile) return { canClaim: false };

    const lastClaim = profile.last_bonus_claim_at ? new Date(profile.last_bonus_claim_at) : new Date(0);
    const now = new Date();
    const diffHours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

    return { 
        canClaim: diffHours >= 24,
        nextClaimIn: Math.max(0, 24 - diffHours)
    };
}

export async function claimDailyBonus(profileId: string) {
    const supabase = await createClient();
    
    try {
        const status = await getBonusStatus(profileId);
        if (!status.canClaim) throw new Error(`Aún faltan ${(status.nextClaimIn || 0).toFixed(1)}h para tu próximo bonus.`);


        const bonusAmount = 2000000;
        
        // Update all budgets
        const { data: participations } = await supabase
            .from('league_participants')
            .select('league_id, current_budget')
            .eq('profile_id', profileId);
        
        if (participations) {
            for (const part of participations) {
                await supabase
                    .from('league_participants')
                    .update({ current_budget: Number(part.current_budget) + bonusAmount })
                    .eq('league_id', part.league_id)
                    .eq('profile_id', profileId);
            }
        }

        // Update profile
        await supabase
            .from('profiles')
            .update({ last_bonus_claim_at: new Date().toISOString() })
            .eq('id', profileId);

        revalidatePath("/");
        return { success: true, message: "!Recibidos $2,000,000 extra!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

