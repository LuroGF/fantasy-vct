import "server-only";

import { getSession } from "@/lib/actions/auth";

function configuredAdminProfileIds() {
  return new Set(
    (process.env.ADMIN_PROFILE_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;

  const adminIds = configuredAdminProfileIds();
  if (adminIds.size === 0 || !adminIds.has(session.user.id)) return null;

  return session;
}

export async function isCurrentUserAdmin() {
  return Boolean(await getAdminSession());
}
