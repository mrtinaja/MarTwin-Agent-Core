import { NextResponse } from 'next/server';
import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    const logsDir = path.join(process.cwd(), 'documentacion', 'logs_cotizacion');
    const tasksFilePath = path.join(process.cwd(), 'documentacion', 'tasks.json');

    if (!fs.existsSync(logsDir)) return NextResponse.json({ error: "No hay logs para procesar" }, { status: 404 });

    const files = await readdir(logsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    let currentTasks = [];
    if (fs.existsSync(tasksFilePath)) {
      currentTasks = JSON.parse(await readFile(tasksFilePath, 'utf8'));
    }

    let importedCount = 0;

    for (const file of jsonFiles) {
      const logContent = JSON.parse(await readFile(path.join(logsDir, file), 'utf8'));
      const reportName = logContent.report.name;

      // Evitar duplicados
      if (!currentTasks.some((t: any) => t.title === reportName)) {
        currentTasks.push({
          id: `log_${Date.now()}_${importedCount}`,
          title: reportName,
          category: "DESARROLLO",
          priority: logContent.future_migration_notes.priority.toUpperCase(),
          completed: false,
          metadata: logContent // Guardamos todo el JSON dentro de la tarea
        });
        importedCount++;
      }
    }

    await writeFile(tasksFilePath, JSON.stringify(currentTasks, null, 2));
    return NextResponse.json({ message: `Se importaron ${importedCount} reportes desde logs.` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
