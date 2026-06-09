import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type GoogleToken = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  user?: unknown;
};

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

async function refreshGoogleAccessToken(token: GoogleToken): Promise<GoogleToken> {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        error: "NO_GOOGLE_REFRESH_TOKEN",
      };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        ...token,
        error: "MISSING_GOOGLE_OAUTH_ENV",
      };
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });

    const refreshedTokens = (await response.json()) as GoogleRefreshResponse;

    if (!response.ok) {
      console.error("GOOGLE_REFRESH_TOKEN_ERROR:", refreshedTokens);

      return {
        ...token,
        error:
          refreshedTokens.error ||
          refreshedTokens.error_description ||
          "GOOGLE_REFRESH_ACCESS_TOKEN_ERROR",
      };
    }

    if (!refreshedTokens.access_token) {
      return {
        ...token,
        error: "GOOGLE_REFRESH_WITHOUT_ACCESS_TOKEN",
      };
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires:
        Date.now() + (refreshedTokens.expires_in || 3600) * 1000,
      refreshToken: refreshedTokens.refresh_token || token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("GOOGLE_REFRESH_ACCESS_TOKEN_EXCEPTION:", error);

    return {
      ...token,
      error: "GOOGLE_REFRESH_ACCESS_TOKEN_EXCEPTION",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: GOOGLE_SCOPES,
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, account, user }) {
      const googleToken = token as GoogleToken;

      if (account) {
        return {
          ...googleToken,
          user,
          accessToken: account.access_token,
          refreshToken: account.refresh_token || googleToken.refreshToken,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
          error: undefined,
        };
      }

      if (
        googleToken.accessToken &&
        googleToken.accessTokenExpires &&
        Date.now() < googleToken.accessTokenExpires - 60 * 1000
      ) {
        return googleToken;
      }

      return refreshGoogleAccessToken(googleToken);
    },

    async session({ session, token }) {
      const googleToken = token as GoogleToken;

      return {
        ...session,
        accessToken: googleToken.accessToken,
        refreshToken: googleToken.refreshToken,
        error: googleToken.error,
      };
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};