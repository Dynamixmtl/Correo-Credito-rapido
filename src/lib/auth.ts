import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // App Service sirve detrás de un proxy: sin confiar en el host, NextAuth v5
  // rechaza con UntrustedHost y TODOS los endpoints /api/auth/* responden 500.
  //
  // ⚠️ Este `trustHost` NO basta por sí solo: en next-auth v5 beta.25 el
  // `setEnvDefaults` interno sobrescribe el valor del config. Verificado en
  // producción el 2026-07-19 (desplegado con este flag y seguía fallando).
  // Lo que realmente lo arregla es el app setting AUTH_TRUST_HOST=true.
  // NO eliminar esa variable del App Service. Se deja este flag para que quede
  // correcto el día que se actualice next-auth a estable.
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      // Entra ID solo emite el claim `email` si el usuario tiene el atributo
      // `mail` poblado o si se declara como optional claim. Sin él, la sesión
      // llega con `user.email` vacío y `requireAuth()` devuelve 401 en TODAS las
      // rutas API aunque el usuario esté correctamente autenticado.
      // Se cae a `preferred_username` / `upn`, que sí vienen siempre.
      if (profile && !token.email) {
        const p = profile as { email?: string; preferred_username?: string; upn?: string };
        token.email = p.email ?? p.preferred_username ?? p.upn;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (session.user && !session.user.email && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
});
