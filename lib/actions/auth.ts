"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ============================================================
// SIGN UP
// ============================================================

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = (
    formData.get("email") as string
  )
    ?.trim()
    .toLowerCase();

  const password =
    formData.get("password") as string;

  const username = (
    formData.get("username") as string
  )?.trim();

  if (
    !email ||
    !password ||
    !username
  ) {
    return {
      error:
        "Todos los campos son obligatorios",
    };
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      error:
        "El formato del email no es válido",
    };
  }

  if (password.length < 8) {
    return {
      error:
        "La contraseña debe tener al menos 8 caracteres",
    };
  }

  if (
    username.length < 3 ||
    username.length > 20
  ) {
    return {
      error:
        "El nombre de usuario debe tener entre 3 y 20 caracteres",
    };
  }

  if (
    !/^[a-zA-Z0-9_]+$/.test(
      username,
    )
  ) {
    return {
      error:
        "El nombre de usuario solo puede contener letras, números y guiones bajos",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          username,
        },
      },
    });

  if (error) {
    return {
      error: error.message,
    };
  }

  // Si Supabase exige confirmación por email,
  // el usuario existe pero todavía NO hay sesión.
  if (!data.session) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      message:
        "Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.",
    };
  }

  redirect("/dashboard");
}

// ============================================================
// SIGN IN
// ============================================================

export async function signIn(
  formData: FormData,
) {
  const supabase =
    await createClient();

  const email = (
    formData.get("email") as string
  )
    ?.trim()
    .toLowerCase();

  const password =
    formData.get("password") as string;

  if (!email || !password) {
    return {
      error:
        "Email y contraseña requeridos",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword(
      {
        email,
        password,
      },
    );

  if (error) {
    console.error(
      "[AUTH] Login error:",
      error.message,
    );

    if (
      error.message
        .toLowerCase()
        .includes("email not confirmed")
    ) {
      return {
        error:
          "Debes confirmar tu correo antes de iniciar sesión.",
      };
    }

    if (
      error.message
        .toLowerCase()
        .includes(
          "invalid login credentials",
        )
    ) {
      return {
        error:
          "Email o contraseña incorrectos.",
      };
    }

    return {
      error: error.message,
    };
  }

  if (!data.user) {
    return {
      error:
        "No se ha podido recuperar el usuario.",
    };
  }

  redirect("/dashboard");
}

// ============================================================
// SIGN OUT
// ============================================================

export async function signOut() {
  const supabase =
    await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

// ============================================================
// GET SESSION
// ============================================================
//
// Para nuestras Server Actions obtenemos primero
// el usuario validado.
//
// ============================================================

export async function getSession() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  return session;
}

// ============================================================
// GET CURRENT USER
// ============================================================

export async function getCurrentUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}