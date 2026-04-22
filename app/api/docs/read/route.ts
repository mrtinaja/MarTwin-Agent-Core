import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name');
    const root = process.cwd();
    const basePath = path.join(root, 'documentacion');

    // 1. LÓGICA DE LECTURA DE ARCHIVO (MODAL HACKER)
    if (fileName) {
      // SEGURIDAD: Evitamos Directory Traversal (que no usen ../../)
      const sanitizedName = path.basename(fileName);
      
      const searchPaths = [
        path.join(basePath, 'prompts', sanitizedName),
        path.join(basePath, 'logs_cotizacion', sanitizedName),
        path.join(basePath, 'test', sanitizedName),
        path.join(basePath, sanitizedName), // Raíz (Migraciones)
      ];

      // Añadimos variantes automáticas si no tiene extensión
      const finalPaths: string[] = [];
      searchPaths.forEach(p => {
        finalPaths.push(p);
        if (!p.endsWith('.md') && !p.endsWith('.json')) {
          finalPaths.push(`${p}.md`);
          finalPaths.push(`${p}.json`);
        }
      });

      for (const p of finalPaths) {
        if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
          const content = fs.readFileSync(p, 'utf8');
          const stats = fs.statSync(p);
          
          // Enviamos contenido + metadata para el visual del modal
          return NextResponse.json({ 
            content,
            metadata: {
              size: (stats.size / 1024).toFixed(2) + ' KB',
              modified: stats.mtime,
              path: p.replace(root, ''), // Ruta técnica para el look hacker
              extension: path.extname(p).toUpperCase()
            }
          });
        }
      }
      return NextResponse.json({ error: "Archivo no detectado en los sectores" }, { status: 404 });
    }

    // 2. LÓGICA DE ESCANEO GENERAL (SELECTORES)
    const sectors = {
      prompts: path.join(basePath, 'prompts'),
      cotizaciones: path.join(basePath, 'logs_cotizacion'),
      tests: path.join(basePath, 'test'),
      migraciones: basePath 
    };

    // Auto-creación de sectores si no existen
    Object.values(sectors).forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const getFilesDetailed = (dir: string, isRoot: boolean = false) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => {
          const fullPath = path.join(dir, f);
          const isFile = fs.lstatSync(fullPath).isFile();
          const hasValidExt = f.endsWith('.md') || f.endsWith('.json');
          return isRoot ? (isFile && hasValidExt) : hasValidExt;
        })
        .map(f => {
          const stats = fs.statSync(path.join(dir, f));
          return { 
            name: f,
            lastModified: stats.mtime,
            size: stats.size
          };
        });
    };

    return NextResponse.json({
      prompts: getFilesDetailed(sectors.prompts),
      cotizaciones: getFilesDetailed(sectors.cotizaciones),
      tests: getFilesDetailed(sectors.tests),
      migraciones: getFilesDetailed(sectors.migraciones, true)
    });

  } catch (error: any) {
    console.error("🔥 Error en API Read:", error.message);
    return NextResponse.json({ error: "SERVER_READ_FAILURE" }, { status: 500 });
  }
}