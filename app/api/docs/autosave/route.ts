import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { type, title, content } = await req.json();
    const root = process.cwd();
    
    // Definimos la ruta según el tipo que detectó la IA
    let targetDir = path.join(root, 'documentacion');
    let extension = '.md';

    if (type === 'test') {
      targetDir = path.join(targetDir, 'test');
    } else if (type === 'cotizacion') {
      targetDir = path.join(targetDir, 'logs_cotizacion');
      extension = '.json';
    }

    // Aseguramos que la carpeta exista
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${title.toUpperCase().replace(/\s+/g, '_')}${extension}`;
    const fullPath = path.join(targetDir, fileName);

    fs.writeFileSync(fullPath, content, 'utf8');

    console.log(`💾 AUTO_SAVE: Archivo guardado en ${fullPath}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Protocolo ${fileName} archivado automáticamente.` 
    });

  } catch (error: any) {
    console.error("🔥 ERROR_AUTOSAVE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}