import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Función auxiliar para obtener la ruta correcta (Raíz del proyecto)
const getTasksPath = () => {
  return path.join(process.cwd(), 'documentacion', 'tasks.json');
};

export async function GET() {
  try {
    const filePath = getTasksPath();
    
    console.log("🔍 API_TASKS buscando en raíz:", filePath);

    if (!fs.existsSync(filePath)) {
      console.log("⚠️ tasks.json no existe en la raíz. Devolviendo array vacío.");
      return NextResponse.json([]);
    }

    const data = await readFile(filePath, 'utf8');
    const tasks = JSON.parse(data || "[]");
    
    console.log(`✅ TASKS CARGADAS: ${tasks.length}`);
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("🔥 Error en GET /api/tasks:", error.message);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const newTask = await req.json();
    const filePath = getTasksPath();
    
    let tasks = [];
    if (fs.existsSync(filePath)) {
      const data = await readFile(filePath, 'utf8');
      tasks = JSON.parse(data || "[]");
    }

    const taskWithId = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
      metadata: { analysis: { context: "Tarea creada manualmente." } }
    };

    tasks.push(taskWithId);
    await writeFile(filePath, JSON.stringify(tasks, null, 2));

    return NextResponse.json(taskWithId);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}