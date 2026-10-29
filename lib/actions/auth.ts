"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRequestOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost || requestHeaders.get("host") || "")
    .split(",")[0]
    .trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = (forwardedProtocol || (host.startsWith("localhost") ? "http" : "https"))
    .split(",")[0]
    .trim();

  if (!host) throw new Error("No se ha podido determinar la URL de la aplicación.");
  return `${protocol}://${host}`;
}

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

  if (!validEmail(email)) {
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
    console.error("[AUTH] Sign-up failed:", error.message);
    const normalizedMessage = error.message.toLowerCase();
    return {
      error:
        normalizedMessage.includes("already registered") ||
        normalizedMessage.includes("already exists")
          ? "Ya existe una cuenta con ese correo."
          : normalizedMessage.includes("rate limit")
            ? "Se han realizado demasiados intentos. Espera unos minutos."
            : "No se ha podido crear la cuenta. Inténtalo de nuevo.",
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
// PASSWORD RECOVERY
// ============================================================

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!validEmail(email)) {
    return { success: false, error: "Introduce un correo electrónico válido." };
  }

  const supabase = await createClient();

  try {
    const origin = await getRequestOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error("[AUTH] Password reset request failed:", error.message);
    }

    // Do not reveal whether an account exists for this address.
    return {
      success: true,
      message:
        "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.",
    };
  } catch (error) {
    console.error("[AUTH] Password reset request failed:", error);
    return {
      success: false,
      error: "No se ha podido solicitar el cambio de contraseña. Inténtalo de nuevo.",
    };
  }
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");

  if (password.length < 8) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  if (password !== confirmation) {
    return { success: false, error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "El enlace ha caducado. Solicita uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[AUTH] Password update failed:", error.message);
    return {
      success: false,
      error: "No se ha podido actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.",
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
      error: "No se ha podido iniciar sesión. Inténtalo de nuevo.",
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
