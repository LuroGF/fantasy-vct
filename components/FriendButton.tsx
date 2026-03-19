"use client";

import { useState } from "react";
import { UserPlus, Check, Clock } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest } from "@/lib/actions/friends";
import { sileo } from "sileo";

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
        title: "Solicitud enviada",
        description: "La solicitud de amistad se ha enviado correctamente",
      });
    } else {
      sileo.error({
        title: "Error al enviar solicitud",
        description: res.error || "No se pudo enviar la solicitud",
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
        title: "Amistad aceptada",
        description: "¡Ahora sois amigos!",
      });
    } else {
      sileo.error({
        title: "Error al aceptar solicitud",
        description: res.error || "No se pudo aceptar la solicitud",
      });
    }

    setLoading(false);
  }

  if (status?.status === "accepted") {
    return (
      <button className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px] opacity-70 cursor-default">
        <Check className="w-3 h-3" /> AMIGOS
      </button>
    );
  }

  if (status?.status === "pending") {
    if (status.user_id === currentUserId) {
      return (
        <button className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px] opacity-50 cursor-default">
          <Clock className="w-3 h-3" /> SOLICITUD ENVIADA
        </button>
      );
    }

    return (
      <button
        onClick={handleAccept}
        disabled={loading}
        className="v-btn-primary py-2 px-4 flex items-center gap-2 text-[10px]"
      >
        {loading ? "..." : "ACEPTAR AMISTAD"}
      </button>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px]"
    >
      <UserPlus className="w-3 h-3" /> {loading ? "ENVIANDO..." : "AÑADIR AMIGO"}
    </button>
  );
}