import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const home = os.homedir();
    const paths = {
      downloads: path.join(home, 'Downloads'),
      desktop: path.join(home, 'Desktop')
    };

    const scanDir = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return [];
      return fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    };

    const downloads = scanDir(paths.downloads);
    const desktop = scanDir(paths.desktop);

    // Contamos imágenes en el escritorio para tu pregunta específica
    const imagesInDesktop = desktop.filter(f => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    ).length;

    return NextResponse.json({ 
      context: `
        SISTEMA_LOCAL_ESTADO:
        - ESCRITORIO: [${desktop.slice(0, 10).join(", ")}...] (Total imágenes: ${imagesInDesktop})
        - DESCARGAS: [${downloads.slice(0, 10).join(", ")}...]
      `,
      desktopCount: imagesInDesktop
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}