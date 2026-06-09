import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionWithGoogleToken = {
  accessToken?: string;
  error?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getGoogleErrorStatus(error: unknown) {
  const candidate = error as {
    code?: number;
    status?: number;
    response?: {
      status?: number;
      data?: unknown;
    };
  };

  return candidate?.code || candidate?.status || candidate?.response?.status;
}

function getGoogleErrorDetails(error: unknown) {
  const candidate = error as {
    response?: {
      data?: unknown;
    };
  };

  return candidate?.response?.data || getErrorMessage(error);
}

function isGoogleAuthError(error: unknown) {
  const status = getGoogleErrorStatus(error);
  const details = JSON.stringify(getGoogleErrorDetails(error)).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    details.includes("invalid authentication credentials") ||
    details.includes("expected oauth 2 access token") ||
    details.includes("invalid token") ||
    details.includes("unauthorized") ||
    details.includes("forbidden") ||
    details.includes("insufficient permission") ||
    details.includes("insufficient authentication") ||
    details.includes("request is missing required authentication credential")
  );
}

export async function GET() {
  try {
    const session = (await getServerSession(
      authOptions
    )) as SessionWithGoogleToken | null;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          total: 0,
          error: "NO_SESSION",
          message: "No hay sesión activa de NextAuth.",
        },
        { status: 401 }
      );
    }

    if (session.error) {
      return NextResponse.json(
        {
          success: false,
          total: 0,
          error: session.error,
          message:
            "La sesión existe, pero NextAuth informó un error con el token.",
        },
        { status: 401 }
      );
    }

    const accessToken = session.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          total: 0,
          error: "NO_GOOGLE_ACCESS_TOKEN",
          message:
            "La sesión no tiene accessToken de Google. Revisar callbacks de NextAuth.",
        },
        { status: 401 }
      );
    }

    const auth = new google.auth.OAuth2();

    auth.setCredentials({
      access_token: accessToken,
    });

    const oauth2 = google.oauth2({
      version: "v2",
      auth,
    });

    try {
      const tokenInfo = await oauth2.tokeninfo({
        access_token: accessToken,
      });

      const scopes = String(tokenInfo.data.scope || "");

      if (!scopes.includes("https://www.googleapis.com/auth/gmail.readonly")) {
        return NextResponse.json(
          {
            success: false,
            total: 0,
            error: "MISSING_GMAIL_SCOPE",
            message:
              "El accessToken existe, pero no tiene scope de Gmail. Hay que agregar gmail.readonly en NextAuth y volver a iniciar sesión.",
            details: {
              email: tokenInfo.data.email,
              scopes,
              requiredScope:
                "https://www.googleapis.com/auth/gmail.readonly",
            },
          },
          { status: 403 }
        );
      }
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          total: 0,
          error: "INVALID_GOOGLE_ACCESS_TOKEN",
          message:
            "Google rechazó el accessToken antes de consultar Gmail. Probablemente está vencido o mal generado.",
          details: getGoogleErrorDetails(error),
        },
        { status: 401 }
      );
    }

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    try {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
        maxResults: 500,
      });

      const count = response.data.messages?.length || 0;

      console.log(`>>> EMAIL_UNREAD_COUNT: ${count}`);

      return NextResponse.json(
        {
          success: true,
          total: count,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (error: unknown) {
      const status = getGoogleErrorStatus(error);

      return NextResponse.json(
        {
          success: false,
          total: 0,
          error: isGoogleAuthError(error)
            ? "GMAIL_AUTH_ERROR"
            : "GMAIL_COUNT_ERROR",
          message: getErrorMessage(error),
          details: getGoogleErrorDetails(error),
        },
        {
          status: status && status >= 400 ? status : 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        total: 0,
        error: "EMAIL_COUNT_UNEXPECTED_ERROR",
        message: getErrorMessage(error),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}