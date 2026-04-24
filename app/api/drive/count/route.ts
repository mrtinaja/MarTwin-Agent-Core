export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: session.accessToken });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 1. Ejecutamos un listado simple para contar archivos de Zurich/Squad
    // Filtramos para no contar basura de la papelera
    const response = await drive.files.list({
      pageSize: 1000, 
      fields: 'files(id)', 
      q: "trashed = false",
      spaces: 'drive',
    });

    const files = response.data.files || [];

    return NextResponse.json({ 
      count: files.length,
      status: "UPLINK_STABLE",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ DRIVE_COUNT_ERROR:", error.message);
    return NextResponse.json(
      { error: "Protocolo de red interrumpido", details: error.message }, 
      { status: 500 }
    );
  }
} // <-- Esta es la llave que faltaba para cerrar la función GET