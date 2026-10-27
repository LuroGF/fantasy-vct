"use server";

import { createClient } from "@/utils/supabase/server";
import { getSession } from "./auth";
import { createNotification } from "@/lib/notifications/create";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/security/validation";

export async function sendFriendRequest(targetId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const senderId = session.user.id;

  if (!isUuid(targetId)) return { success: false, error: "Usuario no válido" };

  if (senderId === targetId) return { success: false, error: "No puedes enviarte una solicitud a ti mismo" };

  const supabase = await createClient();

  // Check if they are already friends or there is a pending request
  const { data: existing } = await supabase
    .from("friends")
    .select("*")
    .or(`and(user_id.eq.${senderId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${senderId})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return { success: false, error: "Ya sois amigos" };
    if (existing.status === 'pending') {
      if (existing.user_id === senderId) return { success: false, error: "Ya has enviado una solicitud" };
      return { success: false, error: "Este usuario ya te ha enviado una solicitud" };
    }
  }

  const { error } = await supabase
    .from("friends")
    .insert({
      user_id: senderId,
      friend_id: targetId,
      status: 'pending'
    });

  if (error) return { success: false, error: "No se ha podido enviar la solicitud" };

  // Notify the target
  const { data: senderProfile } = await supabase.from("profiles").select("username").eq("id", senderId).single();
  
  await createNotification({
    profile_id: targetId,
    title: "Nueva solicitud de amistad",
    message: `${senderProfile?.username || "Alguien"} quiere ser tu amigo en Fantasy VCT.`,
    type: "friend_request",
    category: "social",
    action_url: `/more/profile/${senderId}`,
    dedupe_key: `friend-request:${senderId}`,
  });

  revalidatePath(`/more/profile/${targetId}`);
  return { success: true };
}

export async function acceptFriendRequest(senderId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const userId = session.user.id;

  if (!isUuid(senderId)) return { success: false, error: "Solicitud no válida" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("friends")
    .update({ status: 'accepted' })
    .eq("user_id", senderId)
    .eq("friend_id", userId);

  if (error) return { success: false, error: "No se ha podido aceptar la solicitud" };

  // Notify the sender
  const { data: userProfile } = await supabase.from("profiles").select("username").eq("id", userId).single();
  
  await createNotification({
    profile_id: senderId,
    title: "Solicitud de amistad aceptada",
    message: `${userProfile?.username || "Alguien"} ha aceptado tu solicitud de amistad.`,
    type: "friend_accept",
    category: "social",
    action_url: `/more/profile/${userId}`,
    dedupe_key: `friend-accepted:${userId}`,
  });

  revalidatePath(`/more/profile/${senderId}`);
  return { success: true };
}

export async function getFriendStatus(targetId: string) {
  const session = await getSession();
  if (!session) return null;
  const userId = session.user.id;
  if (!isUuid(targetId)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("friends")
    .select("*")
    .or(`and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`)
    .maybeSingle();

  return data;
}

export async function getUserFriends(userId: string) {
  if (!isUuid(userId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("friends")
    .select(`
      status,
      user:profiles!friends_user_id_fkey(id, username),
      friend:profiles!friends_friend_id_fkey(id, username)
    `)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq("status", "accepted");

  if (!data) return [];
  
  return data.map((f: any) => {
    const isUserSender = f.user.id === userId;
    return isUserSender ? f.friend : f.user;
  });
}
