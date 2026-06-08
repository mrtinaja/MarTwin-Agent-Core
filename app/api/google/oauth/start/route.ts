import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI."
    );
  }

  console.log("GOOGLE_OAUTH_START_REDIRECT_URI:", redirectUri);

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET() {
  try {
    const oauth2Client = getOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive.file"],
    });

    console.log("GOOGLE_OAUTH_START_URL:", url);

    return NextResponse.redirect(url);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error iniciando OAuth.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}