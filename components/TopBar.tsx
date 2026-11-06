"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentHeaderProfile } from "@/lib/actions/profile";
import {
    deleteReadNotification,
    getUnreadCount,
    markNotificationAsRead,
} from "@/lib/actions/notifications";
import {
    getBonusStatus,
    claimDailyBonus,
} from "@/lib/actions/bonus";
import { Bell, CheckCircle, Eye, Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/utils/haptics";

import { useRouter } from "next/navigation";
import { LanguageSelector } from "./LanguageSelector";
import { useLocale } from "./LocaleProvider";

type DailyBonusStatus = {
    canClaim: boolean;
    rewardAmount: number;
    eligibleLeagues: number;
    claimedAt: string | null;
    nextAvailableAt: string | null;
};

type HeaderProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
};

export default function TopBar() {
    const router = useRouter();
    const { locale, t } = useLocale();
    const [user, setUser] = useState<HeaderProfile | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bonusStatus, setBonusStatus] = useState<DailyBonusStatus>({
        canClaim: false,
        rewardAmount: 500_000,
        eligibleLeagues: 0,
        claimedAt: null,
        nextAvailableAt: null,
    });
    const [showNotifications, setShowNotifications] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [claimMessage, setClaimMessage] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const profile = await getCurrentHeaderProfile();
            if (profile) {
                setUser(profile);
                const {
                    getUserNotifications,
                    syncMyAuctionNotifications,
                    flushMyPendingPushNotifications,
                } = await import("@/lib/actions/notifications");

                await syncMyAuctionNotifications();
                await flushMyPendingPushNotifications();
                const bonus = await getBonusStatus();
                setBonusStatus(bonus);
                
                const count = await getUnreadCount();
                setUnreadCount(count);
                
                const list = await getUserNotifications();
                setNotifications(list.slice(0, 5));
            }
        }
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async () => {
        if (!user) return;
        setClaiming(true);
        haptic.medium();
        
        const res = await claimDailyBonus();
        
        if (res.success) {
            haptic.success();
            setClaimMessage(res.message || t("system.rewardClaimed"));
            setBonusStatus((current) => ({ ...current, canClaim: false }));
            router.refresh();

            // Hide after 2 seconds
            setTimeout(() => {
                setClaimMessage(null);
                setShowNotifications(false);
            }, 2000);
        } else {
            haptic.error();
            setClaimMessage(res.error || t("system.genericError"));
            setTimeout(() => setClaimMessage(null), 2000);
        }
        setClaiming(false);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        const notification = notifications.find((item) => item.id === notificationId);
        if (!notification || notification.is_read) return true;

        const result = await markNotificationAsRead(notificationId);
        if (!result.success) return false;

        setNotifications((current) =>
            current.map((item) =>
                item.id === notificationId ? { ...item, is_read: true } : item,
            ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
        return true;
    };

    const handleDeleteNotification = async (notificationId: string) => {
        const result = await deleteReadNotification(notificationId);
        if (!result.success) return;

        haptic.light();
        setNotifications((current) =>
            current.filter((item) => item.id !== notificationId),
        );
    };

    if (!user) return null;

    const hasNotifications = unreadCount > 0 || bonusStatus.canClaim;

    return (
        <header className="sticky top-0 left-0 w-full z-40 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between">
            {/* Background design element */}
            <div className="absolute inset-0 bg-linear-to-r from-v-red/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
                 <div className="flex flex-col">
                    <span className="hidden text-[11px] font-black italic text-v-red leading-none tracking-wider sm:inline sm:text-xs">VCT Fantasy 2027</span>
                    <span className="text-[10px] font-black italic text-v-red leading-none tracking-wider sm:hidden">VCT 27</span>
                    <div className="mt-1 hidden items-center gap-2 sm:flex">
                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                        <span className="text-[7px] font-black uppercase text-green-500/60 tracking-[0.3em] font-sans">{t("header.activeSession")}</span>
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4 relative z-10">
                <LanguageSelector />

                <div className="hidden h-6 w-px bg-white/5 sm:block" />

                <div className="text-right">
                    <span className="block text-[7px] font-black uppercase text-white/30 tracking-widest leading-none">{t("header.user")}</span>
                    <span className="block whitespace-nowrap text-[10px] font-black uppercase italic text-white leading-tight sm:text-xs">{user.username}</span>
                </div>

                <Link
                    href="/more/profile"
                    aria-label={t("header.openProfile")}
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-[10px] font-black uppercase text-v-white transition hover:border-v-red sm:h-9 sm:w-9"
                >
                    {user.avatar_url ? (
                        <Image
                            src={user.avatar_url}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                        />
                    ) : (
                        user.username.slice(0, 2).toUpperCase()
                    )}
                </Link>

                <div className="relative">
                    <button 
                        onClick={() => {
                            haptic.light();
                            setShowNotifications(!showNotifications);
                        }}
                        className={`relative p-2 rounded-sm cursor-pointer transition-all outline-none ${showNotifications ? 'bg-v-red text-white' : 'hover:bg-white/5 text-white/60'}`}
                    >
                        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                        <AnimatePresence>
                            {hasNotifications && (
                                <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-v-red rounded-full border border-v-navy shadow-[0_0_5px_rgba(255,70,85,1)]" 
                                />
                            )}
                        </AnimatePresence>
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowNotifications(false)}
                                    className="fixed inset-0 z-40 lg:absolute lg:right-0 lg:top-full lg:h-[200vh] lg:w-[200vw]"
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-3 w-[280px] sm:w-[320px] z-50 origin-top-right"
                                >
                                    <div className="v-panel bg-v-gray/95 border-v-red/20 shadow-2xl p-0 overflow-hidden">
                                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-v-red">{t("header.notifications")}</h3>
                                            <span className="text-[8px] font-black text-white/20">
                                                {unreadCount > 0
                                                    ? `${unreadCount} ${t(unreadCount > 1 ? "header.newPlural" : "header.newSingle").toUpperCase()}`
                                                    : t("header.upToDate").toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                            {/* System Notifications List */}
                                            {notifications.length > 0 && (
                                                <div className="border-b border-white/5 bg-black/20 px-4 py-2 text-[7px] font-black uppercase tracking-[0.25em] text-white/25">
                                                    {t("header.recentActivity")}
                                                </div>
                                            )}
                                            {notifications.map((n) => (
                                                <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <div className="flex justify-between items-start gap-3 mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                          <p className="text-[10px] font-black uppercase text-v-red italic">{n.title}</p>
                                                          {!n.is_read && <span className="text-[7px] px-1 py-0.5 bg-v-red text-white uppercase font-black tracking-wider">{t("header.newBadge")}</span>}
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            <span className="mr-1 text-[7px] text-white/20">{new Date(n.created_at).toLocaleDateString(locale)}</span>
                                                            {!n.is_read ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMarkAsRead(n.id)}
                                                                    className="rounded-sm p-1 text-white/35 transition hover:bg-white/10 hover:text-white"
                                                                    title={t("header.markRead")}
                                                                    aria-label={`${t("header.markRead")}: ${n.title}`}
                                                                >
                                                                    <Eye size={13} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteNotification(n.id)}
                                                                    className="rounded-sm p-1 text-white/25 transition hover:bg-v-red/15 hover:text-v-red"
                                                                    title={t("header.deleteNotification")}
                                                                    aria-label={`${t("header.deleteNotification")}: ${n.title}`}
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-white/70 leading-tight">{n.message}</p>
                                                    {n.action_url && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                await handleMarkAsRead(n.id);
                                                                setShowNotifications(false);
                                                                router.push(n.action_url);
                                                            }}
                                                            className="mt-2 text-[8px] font-black uppercase tracking-wider text-v-red hover:underline"
                                                        >
                                                            {t("header.open")}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Daily Bonus Item */}
                                            {bonusStatus.canClaim && (
                                                <div className="p-4 border-b border-white/5 bg-v-red/5 hover:bg-v-red/10 transition-colors group">
                                                    <div className="flex gap-4 items-start">
                                                        <div className="w-10 h-10 rounded-sm bg-v-red/20 flex items-center justify-center shrink-0 text-v-red border border-v-red/30 group-hover:border-v-red transition-colors">
                                                            <Gift size={20} />
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase text-white tracking-wider italic">{t("header.dailyReward")}</p>
                                                                <p className="text-[10px] text-white/50 leading-tight mt-1">
                                                                    {bonusStatus.eligibleLeagues > 1
                                                                        ? t("header.rewardMultiple", { count: bonusStatus.eligibleLeagues })
                                                                        : t("header.rewardSingle")}
                                                                </p>
                                                            </div>
                                                            
                                                            {claimMessage ? (
                                                                <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase italic animate-in slide-in-from-left">
                                                                    <div className="w-4 h-4 rounded-full border border-green-500/30 flex items-center justify-center">
                                                                       <CheckCircle size={10} />
                                                                    </div>
                                                                    <span>{claimMessage}</span>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={handleClaim}
                                                                    disabled={claiming}
                                                                    className="w-full v-btn-primary !px-0 !py-2 !text-[9px] italic"
                                                                >
                                                                    {claiming ? t("header.claiming") : t("header.claimReward").toUpperCase()}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {!bonusStatus.canClaim && unreadCount === 0 && notifications.length === 0 && (
                                                <div className="p-10 text-center space-y-3">
                                                    <div className="text-3xl opacity-10">📡</div>
                                                    <p className="text-[9px] uppercase text-white/20 font-black tracking-[0.3em] italic">
                                                        {t("header.noNotifications")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-black/20 text-center">
                                            <button 
                                                onClick={() => setShowNotifications(false)}
                                                className="text-[8px] font-black uppercase text-white/20 hover:text-white cursor-pointer transition-colors"
                                            >
                                                [ {t("header.close")} ]
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </header>
    );
}
