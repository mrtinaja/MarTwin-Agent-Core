import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const resolveTarget = (type: string) => {
  const normalizedType = type.toLowerCase().trim();

  if (normalizedType.includes('qa') || normalizedType.includes('test') || normalizedType.includes('validacion')) {
    return { folder: 'qa', extension: '.md' };
  }
  if (normalizedType.includes('requirement') || normalizedType.includes('requerimiento') || normalizedType.includes('input') || normalizedType.includes('cotizacion')) {
    return { folder: 'requirements', extension: normalizedType.includes('json') || normalizedType.includes('cotizacion') ? '.json' : '.md' };
  }
  if (normalizedType.includes('prompt')) return { folder: 'prompts', extension: '.md' };
  if (normalizedType.includes('knowledge') || normalizedType.includes('conocimiento')) return { folder: 'knowledge', extension: '.md' };

  return { folder: 'work', extension: '.md' };
};

export async function POST(req: Request) {
  try {
    const { type, title, content } = await req.json();
    const root = process.cwd();
    const { folder, extension } = resolveTarget(type || "");
    const targetDir = path.join(root, 'documentacion', folder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${String(title || 'DOCUMENTO').toUpperCase().replace(/\s+/g, '_')}${extension}`;
    const fullPath = path.join(targetDir, path.basename(fileName));

    fs.writeFileSync(fullPath, content, 'utf8');

    console.log(`AUTO_SAVE: Archivo guardado en ${fullPath}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Documento ${fileName} archivado automaticamente.` 
    });

  } catch (error: any) {
    console.error("ERROR_AUTOSAVE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
