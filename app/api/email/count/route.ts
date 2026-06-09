import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';
// @ts-ignore
import { authOptions } from "@/src/lib/auth";

// ESTO FUERZA A QUE NO HAYA CACHÉ
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) return NextResponse.json({ total: 0 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const count = res.data.messages ? res.data.messages.length : 0;
    
    // Log para confirmar en terminal
    console.log(`>>> ENVIANDO AL FRONTEND: ${count}`);

    return NextResponse.json({ total: count });
  } catch (error: any) {
    return NextResponse.json({ total: 0, error: error.message });
  }
}