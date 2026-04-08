import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name');
    const root = process.cwd();
    const basePath = path.join(root, 'documentacion');

    // 1. Lógica de lectura de un archivo específico (para el editor)
    if (fileName) {
      // Buscamos en las 3 ubicaciones posibles
      const paths = [
        path.join(basePath, fileName), // Raíz (Migración)
        path.join(basePath, 'logs_cotizacion', fileName), // Cotización
        path.join(basePath, 'test', fileName) // QA
      ];

      for (const p of paths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          return NextResponse.json({ content });
        }
      }
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    // 2. Lógica de escaneo general para las 3 columnas
    const migPath = basePath;
    const cotPath = path.join(basePath, 'logs_cotizacion');
    const testPath = path.join(basePath, 'test');

    // Aseguramos que la carpeta test exista
    if (!fs.existsSync(testPath)) fs.mkdirSync(testPath, { recursive: true });

    const getFiles = (dir: string, ext: string) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(ext))
        .map(f => ({ name: f, path: dir }));
    };

    return NextResponse.json({
      cotizaciones: getFiles(cotPath, '.json'),
      migraciones: getFiles(migPath, '.md'),
      tests: getFiles(testPath, '.md')
    });

  } catch (error) {
    return NextResponse.json({ error: "Error de lectura" }, { status: 500 });
  }
}