import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ruta a nuestra carpeta de logs
    const logsDir = path.join(process.cwd(), 'app', 'documentacion', 'logs_cotizacion');
    
    if (!fs.existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }

    const filePath = path.join(logsDir, file.name);
    await writeFile(filePath, buffer);

    return NextResponse.json({ message: "Archivo subido con éxito", fileName: file.name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}