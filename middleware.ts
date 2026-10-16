import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(
  request: NextRequest,
) {
  // Primero dejamos que Supabase:
  // - lea/refresque la sesión
  // - actualice las cookies
  // - proteja las rutas privadas
  const response =
    await updateSession(request);

  // Cabeceras que ya tenía tu proyecto
  response.headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  response.headers.set(
    "X-Frame-Options",
    "DENY",
  );

  response.headers.set(
    "X-XSS-Protection",
    "1; mode=block",
  );

  // Scope del service worker
  if (
    request.nextUrl.pathname.startsWith(
      "/sw.js",
    )
  ) {
    response.headers.set(
      "Service-Worker-Allowed",
      "/",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};