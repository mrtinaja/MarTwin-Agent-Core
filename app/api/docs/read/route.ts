import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const sectorConfig = {
  prompts: { folder: 'prompts', legacyFolders: [] },
  requirements: { folder: 'requirements', legacyFolders: ['logs_cotizacion'] },
  workItems: { folder: 'work', legacyFolders: [''] },
  qa: { folder: 'qa', legacyFolders: ['test'] },
  knowledge: { folder: 'knowledge', legacyFolders: [] },
};

const legacyResponseKeys = {
  cotizaciones: 'requirements',
  migrations: 'workItems',
  migraciones: 'workItems',
  tests: 'qa',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name');
    const root = process.cwd();
    const basePath = path.join(root, 'documentacion');

    // 1. MODO LECTURA DE ARCHIVO INDIVIDUAL (MODAL)
    if (fileName) {
      const sanitizedName = path.basename(fileName);
      const configuredPaths = Object.values(sectorConfig).flatMap((sector) => [
        path.join(basePath, sector.folder, sanitizedName),
        ...sector.legacyFolders.map((folder) => path.join(basePath, folder, sanitizedName)),
      ]);
      const searchPaths = [...configuredPaths, path.join(basePath, sanitizedName)];

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
    const sectors = Object.fromEntries(
      Object.entries(sectorConfig).map(([key, sector]) => [
        key,
        {
          path: path.join(basePath, sector.folder),
          legacyPaths: sector.legacyFolders.map((folder) => path.join(basePath, folder)),
        },
      ])
    );

    // Asegurar existencia de carpetas
    Object.values(sectors).forEach(({ path: dir }) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const getFilesDetailed = (dir: string, isRoot: boolean = false) => {
      if (!fs.existsSync(dir)) return [];
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

    const mergeUnique = (items: Array<{ name: string; size: number }>) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
    };

    const response = Object.fromEntries(
      Object.entries(sectors).map(([key, sector]) => {
        const files = [
          ...getFilesDetailed(sector.path),
          ...sector.legacyPaths.flatMap((legacyPath) => getFilesDetailed(legacyPath, legacyPath === basePath)),
        ];
        return [key, mergeUnique(files)];
      })
    );

    return NextResponse.json({
      ...response,
      prompts: response.prompts,
      cotizaciones: response.requirements,
      tests: response.qa,
      migrations: response.workItems,
      migraciones: response.workItems,
      legacyResponseKeys,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
