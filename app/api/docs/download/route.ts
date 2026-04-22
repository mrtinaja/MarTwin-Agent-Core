import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('file');

  if (!fileName) return new Response("Falta nombre de archivo", { status: 400 });

  const root = process.cwd();
  const paths = [
    path.join(root, 'documentacion', fileName),
    path.join(root, 'documentacion', 'test', fileName),
    path.join(root, 'documentacion', 'logs_cotizacion', fileName)
  ];

  // Buscamos el archivo en las 3 carpetas
  let filePath = paths.find(p => fs.existsSync(p));

  if (!filePath) return new Response("Archivo no encontrado", { status: 404 });

  const fileBuffer = fs.readFileSync(filePath);
  
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': fileName.endsWith('.json') ? 'application/json' : 'text/markdown',
    },
  });
}