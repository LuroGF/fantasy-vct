"use server";

import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  if (!email || !password || !username) {
    return { error: "Todos los campos son obligatorios" };
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

  // Nota: Si el usuario tiene habilitado el trigger handle_new_user, 
  // el perfil se creará automáticamente en public.profiles.
  // De lo contrario, tendríamos que insertarlo manualmente aquí:
  // const { error: profileError } = await supabase.from('profiles').insert({ id: data.user?.id, username });

  return redirect("/dashboard");
}

export async function signIn(formData: FormData) {
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
  await supabase.auth.signOut();
  return redirect("/");
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
