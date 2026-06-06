export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const resolveDocumentTarget = (type: string) => {
  const normalizedType = type.toLowerCase().trim();

  if (normalizedType.includes('prompt')) return { subFolder: 'prompts', extension: '.md' };
  if (normalizedType.includes('requirement') || normalizedType.includes('requerimiento') || normalizedType.includes('input') || normalizedType.includes('cotizacion')) {
    return { subFolder: 'requirements', extension: normalizedType.includes('json') || normalizedType.includes('cotizacion') ? '.json' : '.md' };
  }
  if (normalizedType.includes('qa') || normalizedType.includes('test') || normalizedType.includes('validacion')) {
    return { subFolder: 'qa', extension: '.md' };
  }
  if (normalizedType.includes('knowledge') || normalizedType.includes('conocimiento')) {
    return { subFolder: 'knowledge', extension: '.md' };
  }
  if (normalizedType.includes('work') || normalizedType.includes('desarrollo') || normalizedType.includes('artefacto') || normalizedType.includes('migracion')) {
    return { subFolder: 'work', extension: '.md' };
  }

  return { subFolder: 'work', extension: '.md' };
};

export async function POST(req: Request) {
  try {
    const { title, content, type } = await req.json();
    const root = process.cwd();
    const { subFolder, extension } = resolveDocumentTarget(type || "");

    const targetDir = path.join(root, 'documentacion', subFolder);
    const safeTitle = path.basename(title || 'documento');
    const filePath = path.join(targetDir, `${safeTitle}${path.extname(safeTitle) ? '' : extension}`);

    console.log(`DEBUG_SAVE: Recibido Tipo "${type}" -> Guardando en "${subFolder}"`);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const strayFile = path.join(root, 'documentacion', `${safeTitle}${path.extname(safeTitle) ? '' : extension}`);
    if (subFolder !== "" && fs.existsSync(strayFile)) {
      fs.unlinkSync(strayFile);
      console.log(`CLEANUP: Borrado archivo suelto: ${strayFile}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');

    return NextResponse.json({ success: true, savedAt: subFolder });
  } catch (error: any) {
    console.error("Error en Save:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
