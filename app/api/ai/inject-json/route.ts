import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const { jsonText } = await req.json();
    const data = JSON.parse(jsonText);
    const fileName = `${data.report?.name || 'reporte_sin_nombre'}.json`;

    const logsDir = path.join(process.cwd(), 'app', 'documentacion', 'logs_cotizacion');
    if (!fs.existsSync(logsDir)) await mkdir(logsDir, { recursive: true });

    await writeFile(path.join(logsDir, fileName), JSON.stringify(data, null, 2));

    return NextResponse.json({ message: "Inyección exitosa", fileName });
  } catch (error: any) {
    return NextResponse.json({ error: "JSON Inválido o Error de Disco" }, { status: 400 });
  }
}