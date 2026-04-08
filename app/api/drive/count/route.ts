import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || "";

    // --- AQUÍ ESTABA EL ERROR: Inicializamos el cliente ---
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Filtro para no traer basura (solo archivos que no estén en la papelera)
    const qFilter = query 
      ? `name contains '${query}' and trashed = false` 
      : "trashed = false";

    const response = await drive.files.list({
      pageSize: 40,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      q: qFilter,
    });

    const files = response.data.files || [];

    return NextResponse.json({ 
      total: files.length, 
      files: files 
    });

  } catch (error: any) {
    console.error("❌ DRIVE_ERROR:", error.message);
    return NextResponse.json(
      { error: "Falla en comunicación con Drive", details: error.message }, 
      { status: 500 }
    );
  }
}