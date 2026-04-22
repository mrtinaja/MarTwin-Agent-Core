import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { title, content, type } = await req.json();
    const root = process.cwd();

    // Normalizamos el tipo para evitar errores de mayúsculas o espacios
    const normalizedType = type ? type.toLowerCase().trim() : "";
    
    let subFolder = "";
    let extension = ".md";

    // Mapeo ultra-seguro
    if (normalizedType.includes('prompt')) {
      subFolder = 'prompts';
    } else if (normalizedType.includes('cotizacion')) {
      subFolder = 'logs_cotizacion';
      extension = ".json";
    } else if (normalizedType.includes('test')) {
      subFolder = 'test';
    }

    // Construcción de la ruta
    const targetDir = path.join(root, 'documentacion', subFolder);
    const filePath = path.join(targetDir, `${title}${extension}`);

    // LOG DE CONTROL (Mirá la terminal de VS Code al guardar)
    console.log(`DEBUG_SAVE: Recibido Tipo "${type}" -> Guardando en "${subFolder}"`);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Si existía una versión "suelta" en la raíz por error, la borramos para no confundir
    const strayFile = path.join(root, 'documentacion', `${title}${extension}`);
    if (subFolder !== "" && fs.existsSync(strayFile)) {
      fs.unlinkSync(strayFile);
      console.log(`🧹 Borrado archivo suelto: ${strayFile}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');

    return NextResponse.json({ success: true, savedAt: subFolder });

  } catch (error: any) {
    console.error("🔥 Error en Save:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}