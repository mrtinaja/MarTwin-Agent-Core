export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { NextResponse } from "next/server";

// --- SISTEMA DE CACHÉ MEJORADO ---
const driveCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos para el índice de títulos

export async function GET(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || "";
    const mode = searchParams.get('mode'); // 'index' para Pago TIC RAG
    
    const cacheKey = `${session.user.email}-${query}-${mode}`;

    // 1. VERIFICAR CACHÉ
    const cached = driveCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log("⚡ [DRIVE] Servido desde caché de arquitectura.");
      return NextResponse.json(cached.data);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 2. CONSTRUCCIÓN DE QUERY FILTRADA
    const qFilter = query 
      ? `name contains '${query}' and trashed = false` 
      : "trashed = false";

    // 3. OPTIMIZACIÓN DE CARGA (L3 Protocol)
    // Si es modo index, pedimos 1000 resultados y SOLO el campo name
    const isIndex = mode === 'index';
    const response = await drive.files.list({
      pageSize: isIndex ? 1000 : 50, 
      fields: isIndex ? 'files(name)' : 'files(id, name, mimeType, modifiedTime, webViewLink)', 
      q: qFilter,
      spaces: 'drive',
    });

    const files = response.data.files || [];
    
    // 4. FORMATEO PARA CONSUMO DE IA
    // Si Pago TIC pide el índice, le mandamos un objeto optimizado para su contexto
    const result = isIndex ? {
      kind: "drive#index",
      total: files.length,
      titles: files.map(f => f.name).join(' | ') // Formato ultra-compacto para tokens
    } : { 
      total: files.length, 
      files: files,
      source: 'live_network'
    };

    // 5. ACTUALIZAR CACHÉ Y RESPONDER
    driveCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("❌ DRIVE_CRITICAL_ERROR:", error.message);
    return NextResponse.json(
      { error: "Protocolo de red interrumpido", details: error.message }, 
      { status: 500 }
    );
  }
}
