import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';
// @ts-ignore
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
      console.log("⚠️ CALENDAR: No se encontró accessToken en la sesión");
      return NextResponse.json({ events: [] }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    // Traemos todos los calendarios
    const calList = await calendar.calendarList.list();
    const ids = calList.data.items?.map(c => c.id) || ['primary'];

    const now = new Date();
    // Filtro amplio: desde principio de mes hasta fin del mes que viene
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const promises = ids.map(id => 
      calendar.events.list({
        calendarId: id as string,
        timeMin: start,
        timeMax: end,
        singleEvents: true,
      }).catch(() => ({ data: { items: [] } }))
    );

    const results = await Promise.all(promises);
    const allEvents = results.flatMap(r => r.data.items || []);

    return NextResponse.json({ events: allEvents });
  } catch (error: any) {
    console.error("❌ ERROR CALENDAR API:", error.message);
    return NextResponse.json({ events: [], error: error.message }, { status: 500 });
  }
}