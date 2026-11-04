"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { translateMessage, type MessageKey } from "@/lib/i18n/messages";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getFormLocale(formData: FormData) {
  const value = String(formData.get("locale") || "");
  return isLocale(value) ? value : defaultLocale;
}

function authMessage(formData: FormData, key: MessageKey) {
  return translateMessage(getFormLocale(formData), key);
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

  if (formData.get("legalAccepted") !== "true") {
    return {
      error:
        authMessage(formData, "auth.legalRequired"),
    };
  }

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
        authMessage(formData, "auth.requiredFields"),
    };
  }

  if (!validEmail(email)) {
    return {
      error:
        authMessage(formData, "auth.invalidEmail"),
    };
  }

  if (password.length < 8) {
    return {
      error:
        authMessage(formData, "auth.passwordMin"),
    };
  }

  if (
    username.length < 3 ||
    username.length > 20
  ) {
    return {
      error:
        authMessage(formData, "auth.usernameLength"),
    };
  }

  if (
    !/^[a-zA-Z0-9_]+$/.test(
      username,
    )
  ) {
    return {
      error:
        authMessage(formData, "auth.usernameCharacters"),
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
          ? authMessage(formData, "auth.emailExists")
          : normalizedMessage.includes("rate limit")
            ? authMessage(formData, "auth.rateLimit")
            : authMessage(formData, "auth.createFailed"),
    };
  }

  // Si Supabase exige confirmación por email,
  // el usuario existe pero todavía NO hay sesión.
  if (!data.session) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      message:
        authMessage(formData, "auth.confirmationSent"),
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
    return { success: false, error: authMessage(formData, "auth.invalidEmail") };
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
        authMessage(formData, "auth.resetRequestSent"),
    };
  } catch (error) {
    console.error("[AUTH] Password reset request failed:", error);
    return {
      success: false,
      error: authMessage(formData, "auth.resetRequestFailed"),
    };
  }
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");

  if (password.length < 8) {
    return {
      success: false,
      error: authMessage(formData, "auth.passwordMin"),
    };
  }

  if (password !== confirmation) {
    return { success: false, error: authMessage(formData, "auth.passwordsMismatch") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: authMessage(formData, "auth.expiredLink"),
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[AUTH] Password update failed:", error.message);
    return {
      success: false,
      error: authMessage(formData, "auth.passwordUpdateFailed"),
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
        authMessage(formData, "auth.credentialsRequired"),
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
          authMessage(formData, "auth.emailNotConfirmed"),
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
          authMessage(formData, "auth.incorrectCredentials"),
      };
    }

    return {
      error: authMessage(formData, "auth.signInFailed"),
    };
  }

  if (!data.user) {
    return {
      error:
        authMessage(formData, "auth.userUnavailable"),
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
// DELETE ACCOUNT
// ============================================================

export async function verifyAccountDeletionPassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { success: false, error: "La sesión ya no es válida." };
  }

  if (!password) {
    return { success: false, error: "Introduce tu contraseña actual." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) {
    return { success: false, error: "La contraseña no es correcta." };
  }

  return { success: true };
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "")
    .trim()
    .toUpperCase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { success: false, error: "La sesión ya no es válida." };
  }

  if (confirmation !== "ELIMINAR") {
    return {
      success: false,
      error: "Escribe ELIMINAR para confirmar el borrado definitivo.",
    };
  }

  if (!password) {
    return { success: false, error: "Introduce tu contraseña actual." };
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (passwordError) {
    return { success: false, error: "La contraseña no es correcta." };
  }

  const { error: deletionError } = await supabaseAdmin.rpc(
    "delete_account_for_profile",
    { p_user_id: user.id },
  );

  if (deletionError) {
    console.error("[AUTH] Account deletion failed:", deletionError.message);
    return {
      success: false,
      error:
        "No se ha podido eliminar la cuenta. Inténtalo de nuevo o contacta con soporte.",
    };
  }

  await supabase.auth.signOut();
  redirect("/login?accountDeleted=1");
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
