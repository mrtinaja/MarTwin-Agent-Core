import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name');
    const root = process.cwd();
    const basePath = path.join(root, 'documentacion');

    // 1. MODO LECTURA DE ARCHIVO INDIVIDUAL (MODAL)
    if (fileName) {
      const sanitizedName = path.basename(fileName);
      const searchPaths = [
        path.join(basePath, 'prompts', sanitizedName),
        path.join(basePath, 'logs_cotizacion', sanitizedName),
        path.join(basePath, 'test', sanitizedName),
        path.join(basePath, sanitizedName), 
      ];

      // Variantes de extensión
      const finalPaths: string[] = [];
      searchPaths.forEach(p => {
        finalPaths.push(p);
        if (!p.endsWith('.md') && !p.endsWith('.json')) {
          finalPaths.push(`${p}.md`, `${p}.json`);
        }
      });

      for (const p of finalPaths) {
        if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
          const content = fs.readFileSync(p, 'utf8');
          const stats = fs.statSync(p);
          return NextResponse.json({ 
            content,
            metadata: {
              size: (stats.size / 1024).toFixed(2) + ' KB',
              modified: stats.mtime,
              path: p.replace(root, ''),
              extension: path.extname(p).toUpperCase()
            }
          });
        }
      }
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // 2. MODO ESCANEO DE SECTORES (COLUMNAS)
    const sectors = {
      prompts: path.join(basePath, 'prompts'),
      cotizaciones: path.join(basePath, 'logs_cotizacion'),
      tests: path.join(basePath, 'test'),
      migraciones: basePath 
    };

    // Asegurar existencia de carpetas
    Object.values(sectors).forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const getFilesDetailed = (dir: string, isRoot: boolean = false) => {
      return fs.readdirSync(dir)
        .filter(f => {
          const p = path.join(dir, f);
          const isFile = fs.lstatSync(p).isFile();
          const valid = f.endsWith('.md') || f.endsWith('.json');
          return isRoot ? (isFile && valid) : valid;
        })
        .map(f => ({
          name: f,
          size: fs.statSync(path.join(dir, f)).size
        }));
    };

    return NextResponse.json({
      prompts: getFilesDetailed(sectors.prompts),
      cotizaciones: getFilesDetailed(sectors.cotizaciones),
      tests: getFilesDetailed(sectors.tests),
      migrations: getFilesDetailed(sectors.migraciones, true)
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}