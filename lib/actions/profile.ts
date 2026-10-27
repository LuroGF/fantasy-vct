"use server";

import { createClient } from "@/utils/supabase/server";
import { getSession } from "./auth";
import { revalidatePath } from "next/cache";
import { cleanPlainText, isUuid } from "@/lib/security/validation";

export async function updateProfile(data: {
  username?: string;
  bio?: string;
  banner_color?: string;
  fav_team_id?: string;
  title?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const userId = session.user.id;

  const username = data.username === undefined ? undefined : cleanPlainText(data.username, 20);
  const bio = data.bio === undefined ? undefined : cleanPlainText(data.bio, 300);
  const title = data.title === undefined ? undefined : cleanPlainText(data.title, 40);
  const bannerColor = data.banner_color === undefined
    ? undefined
    : /^#[0-9a-f]{6}$/i.test(data.banner_color)
      ? data.banner_color
      : null;
  const favouriteTeamId = data.fav_team_id === undefined
    ? undefined
    : data.fav_team_id === "" || data.fav_team_id === null
      ? null
      : isUuid(data.fav_team_id)
        ? data.fav_team_id
        : undefined;

  if (username !== undefined && (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username))) {
    return { success: false, error: "El nombre debe tener entre 3 y 20 caracteres y usar solo letras, números o guion bajo." };
  }
  if (data.banner_color !== undefined && bannerColor === null) {
    return { success: false, error: "El color del banner no es válido." };
  }
  if (data.fav_team_id !== undefined && favouriteTeamId === undefined) {
    return { success: false, error: "El equipo seleccionado no es válido." };
  }

  const safeData = {
    ...(username !== undefined ? { username } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(bannerColor !== undefined ? { banner_color: bannerColor } : {}),
    ...(favouriteTeamId !== undefined ? { fav_team_id: favouriteTeamId } : {}),
  };

  if (Object.keys(safeData).length === 0) {
    return { success: false, error: "No hay cambios válidos para guardar." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update(safeData)
    .eq("id", userId);

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "No se ha podido actualizar el perfil." };
  }

  revalidatePath("/more/profile");
  return { success: true };
}

export async function getAllTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_teams")
    .select("id, name, tag, logo_url")
    .order("name");
  
  if (error) return [];
  return data;
}
