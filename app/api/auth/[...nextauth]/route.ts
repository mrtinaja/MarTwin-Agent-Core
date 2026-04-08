import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // IMPORTANTE: Aquí pedimos acceso a Drive, Calendar y Gmail en una sola llave
         scope: [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive", 
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly"
].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    // 1. Guardamos el Access Token de Google en el JWT de NextAuth
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // 2. Pasamos ese Token a la Sesión para que el Frontend y las APIs lo vean
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/', // Redirige a la home si hay error
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };