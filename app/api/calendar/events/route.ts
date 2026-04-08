import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id, summary, description, start, end } = await req.json();

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // --- FUNCIÓN DE LIMPIEZA DE FECHA PARA GOOGLE ---
  const formatToGoogleDate = (input: any) => {
  const value = typeof input === 'object' ? (input.dateTime || input.date) : input;
  
  // Si el valor no tiene una 'T' (es solo fecha YYYY-MM-DD), 
  // le agregamos la hora de inicio del día para fijarla
  const finalValue = value.includes('T') ? value : `${value}T00:00:00`;
  
  const date = new Date(finalValue);
  if (isNaN(date.getTime())) throw new Error("Fecha inválida");
  
  return { 
    dateTime: date.toISOString(), 
    timeZone: 'America/Argentina/Buenos_Aires' 
  };
};

    const eventData = {
      summary: summary || "Sin título",
      description: description || "",
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({ calendarId: 'primary', eventId: id! });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}