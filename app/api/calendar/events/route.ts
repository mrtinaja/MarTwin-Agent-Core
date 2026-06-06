import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
// 🟢 CAMBIO CRÍTICO: Importamos desde /auth, no desde /route para evitar fallos de compilación
import { authOptions } from "@/app/api/auth/[...nextauth]/auth"; 
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, summary, description, start, end } = await req.json();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID, 
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // --- FUNCIÓN DE LIMPIEZA DE FECHA (Optimización de Pago TIC) ---
    const formatToGoogleDate = (input: any) => {
      const value = typeof input === 'object' ? (input.dateTime || input.date) : input;
      if (!value) throw new Error("Fecha faltante");

      // Forzamos formato ISO y manejamos zona horaria local
      const finalValue = value.includes('T') ? value : `${value}T00:00:00`;
      const date = new Date(finalValue);
      
      if (isNaN(date.getTime())) throw new Error("Fecha inválida: " + value);
      
      return { 
        dateTime: date.toISOString(), 
        timeZone: 'America/Argentina/Buenos_Aires' 
      };
    };

    const eventData = {
      summary: summary || "Sin título (Pago TIC)",
      description: description || "Evento gestionado por Pago TIC Agent Core",
      start: formatToGoogleDate(start),
      end: formatToGoogleDate(end || start),
    };

    let response;
    if (id) {
      response = await calendar.events.update({
        calendarId: 'primary',
        eventId: id,
        requestBody: eventData,
      });
    } else {
      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
      });
    }

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("❌ CALENDAR_API_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID faltante" }, { status: 400 });

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({ calendarId: 'primary', eventId: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
