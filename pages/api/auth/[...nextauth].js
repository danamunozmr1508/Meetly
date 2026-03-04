import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
 callbacks: {
  async jwt({ token, account }) {
    // Cuando el usuario hace login (Google manda account)
    if (account) {
      token.accessToken = account.access_token;

      // Google NO siempre manda refresh_token, pero cuando lo manda hay que guardarlo
      if (account.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      // Guardamos cuándo expira el access token (si viene)
      if (account.expires_at) {
        token.expiresAt = account.expires_at * 1000; // a milisegundos
      }
    }
    return token;
  },

  async session({ session, token }) {
  if (session) {
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
    session.expiresAt = token.expiresAt;
  }
  return session;
},
},
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);