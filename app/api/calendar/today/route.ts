import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';
// @ts-ignore
import { authOptions } from "@/src/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
      console.log("⚠️ CALENDAR: No se encontró accessToken");
      return NextResponse.json({ events: [] }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    // Usamos la instancia específica para evitar cargar todo el SDK si es posible
    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    // Filtro: desde hoy hasta 30 días después para mayor velocidad
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

    console.log("📅 Fetching primary calendar events...");

    // OPTIMIZACIÓN CRÍTICA: Solo pedimos el calendario 'primary'
    // Esto evita las múltiples peticiones que sumaban 22 segundos.
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20 // Suficiente para el contexto del agente
    });

    const events = response.data.items || [];
    
    return NextResponse.json({ 
      events,
      count: events.length 
    });

  } catch (error: any) {
    console.error("❌ ERROR CALENDAR API:", error.message);
    // Si el error es de auth, podrías querer retornar 401
    const status = error.code === 401 ? 401 : 500;
    return NextResponse.json({ events: [], error: error.message }, { status });
  }
}