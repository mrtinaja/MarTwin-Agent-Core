import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server'; // Esto arregla el error "Cannot find name NextResponse"
import { Readable } from 'stream';

// @ts-ignore - Usamos el ignore para que TypeScript no chille por la estructura de carpetas
import { authOptions } from "../../../../src/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Guardamos la respuesta en una variable distinta para no chocar con NextResponse
    const driveResponse = await drive.files.create({
      requestBody: { 
        name: file.name,
        mimeType: file.type 
      },
      media: { 
        mimeType: file.type, 
        body: stream 
      },
      fields: 'id, name, webViewLink'
    });

    return NextResponse.json(driveResponse.data);

  } catch (error: any) {
    console.error("🔥 ERROR EN UPLOAD:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error.response?.data || "Error interno"
    }, { status: 500 });
  }
}