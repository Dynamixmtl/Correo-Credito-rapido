import { NextResponse } from "next/server";
import { auth } from "./auth";
import type { Session } from "next-auth";

export type AuthedSession = Session & { user: NonNullable<Session["user"]> };

// Valida sesión y retorna session o respuesta 401
export async function requireAuth(): Promise<
  { session: AuthedSession; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.email) {
    // Distinguir "sin sesión" de "sesión válida pero sin email" — el segundo caso
    // devuelve el mismo 401 mudo y es indistinguible desde el cliente.
    console.warn(
      session
        ? `[requireAuth] session sans email (name=${session.user?.name ?? "?"}) — claim email absent d'Entra ID`
        : "[requireAuth] aucune session"
    );
    return {
      session: null,
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { session: session as AuthedSession, error: null };
}

// Respuesta de error estándar
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Parsear body JSON con manejo de error
export async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
