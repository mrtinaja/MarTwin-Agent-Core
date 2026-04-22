import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export const revalidate = 0;
const filePath = path.join(process.cwd(), 'documentacion', 'test', 'tasks.json');

// LEER (GET)
export async function GET() {
  try {
    if (!fs.existsSync(filePath)) return NextResponse.json([]);
    const data = await readFile(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data || "[]"));
  } catch (error) {
    return NextResponse.json([]);
  }
}

// GUARDAR (POST) - ¡ESTO ES LO QUE TE DABA ERROR 405!
export async function POST(req: Request) {
  try {
    const updatedTask = await req.json();
    const data = await readFile(filePath, 'utf8');
    let tasks = JSON.parse(data || "[]");

    // Buscamos y actualizamos el reporte
    tasks = tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t);

    await writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error guardando:", error);
    return NextResponse.json({ error: "Error al escribir" }, { status: 500 });
  }
}