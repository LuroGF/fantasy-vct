"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();

  if (!email || !password || !username) {
    return { error: "Todos los campos son obligatorios" };
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "El formato del email no es válido" };
  }

  // Minimum password length
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  // Username max length and allowed chars (alphanumeric + underscore)
  if (username.length < 3 || username.length > 20) {
    return { error: "El nombre de usuario debe tener entre 3 y 20 caracteres" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "El nombre de usuario solo puede contener letras, números y guiones bajos" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña requeridos" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/");
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
