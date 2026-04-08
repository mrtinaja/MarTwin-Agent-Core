import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { title, content, type } = await req.json(); // 'cotizacion', 'migracion', 'test'
    const root = process.cwd();
    let targetPath = "";
    let fileName = title.toUpperCase().replace(/\s+/g, '_');

    switch (type) {
      case 'cotizacion':
        targetPath = path.join(root, 'documentacion', 'logs_cotizacion', `${fileName}.json`);
        break;
      case 'test':
        targetPath = path.join(root, 'documentacion', 'test', `${fileName}.md`);
        break;
      default: // migracion
        targetPath = path.join(root, 'documentacion', `${fileName}.md`);
    }

    fs.writeFileSync(targetPath, content, 'utf8');
    return NextResponse.json({ success: true, path: targetPath });

  } catch (error) {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}