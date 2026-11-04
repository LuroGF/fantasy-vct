"use client";

import { useState } from "react";
import { UserPlus, Check, Clock } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest } from "@/lib/actions/friends";
import { sileo } from "sileo";
import { useLocale } from "@/components/LocaleProvider";

interface FriendButtonProps {
  targetId: string;
  initialStatus: any;
  currentUserId: string;
}

export function FriendButton({
  targetId,
  initialStatus,
  currentUserId,
}: FriendButtonProps) {
  const { t } = useLocale();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  if (targetId === currentUserId) return null;

  async function handleRequest() {
    setLoading(true);
    const res = await sendFriendRequest(targetId);

    if (res.success) {
      setStatus({
        user_id: currentUserId,
        friend_id: targetId,
        status: "pending",
      });
      sileo.success({
        title: t("profile.requestSent"),
        description: t("profile.requestSentDescription"),
      });
    } else {
      sileo.error({
        title: t("profile.requestError"),
        description: res.error || t("profile.requestErrorDescription"),
      });
    }

    setLoading(false);
  }

  async function handleAccept() {
    setLoading(true);
    const res = await acceptFriendRequest(status.user_id);

    if (res.success) {
      setStatus({ ...status, status: "accepted" });
      sileo.success({
        title: t("profile.friendshipAccepted"),
        description: t("profile.friendshipAcceptedDescription"),
      });
    } else {
      sileo.error({
        title: t("profile.acceptError"),
        description: res.error || t("profile.acceptErrorDescription"),
      });
    }

    setLoading(false);
  }

  if (status?.status === "accepted") {
    return (
      <button className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px] opacity-70 cursor-default">
        <Check className="w-3 h-3" /> {t("profile.friends")}
      </button>
    );
  }

  if (status?.status === "pending") {
    if (status.user_id === currentUserId) {
      return (
        <button className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px] opacity-50 cursor-default">
          <Clock className="w-3 h-3" /> {t("profile.pendingRequest")}
        </button>
      );
    }

    return (
      <button
        onClick={handleAccept}
        disabled={loading}
        className="v-btn-primary py-2 px-4 flex items-center gap-2 text-[10px]"
      >
        {loading ? "..." : t("profile.acceptFriend")}
      </button>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px]"
    >
      <UserPlus className="w-3 h-3" /> {loading ? t("profile.sending") : t("profile.addFriend")}
    </button>
  );
}
