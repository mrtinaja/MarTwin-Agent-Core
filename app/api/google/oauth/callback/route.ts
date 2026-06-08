import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      throw new Error("Google no devolvió código OAuth.");
    }

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      throw new Error(
        "Google no devolvió refresh_token. Probá borrar el acceso de la app en tu cuenta Google y volver a autorizar."
      );
    }

    const safeRefreshToken = escapeHtml(refreshToken);

    return new Response(
      `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Google OAuth MarTwin</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #0f0a24;
      color: #ffffff;
      padding: 40px;
    }

    code {
      display: block;
      white-space: pre-wrap;
      word-break: break-all;
      background: #1e1248;
      border: 1px solid #46f2c8;
      color: #46f2c8;
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
    }

    .box {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      color: #46f2c8;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>OAuth generado correctamente</h1>
    <p>Copiá este valor y pegalo en tu archivo <strong>.env.local</strong>:</p>

    <code>GOOGLE_REFRESH_TOKEN=${safeRefreshToken}</code>

    <p>Después reiniciá Next:</p>
    <code>rm -rf .next
npm run dev</code>
  </div>
</body>
</html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error procesando OAuth.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}