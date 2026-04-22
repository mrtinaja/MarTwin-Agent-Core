import { NextResponse } from 'next/server';
import { writeFile, readFile, readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    const root = process.cwd();
    
    // 🚩 RUTA CORREGIDA: Apuntamos a la raíz del proyecto, no adentro de /app
    const logsDir = path.join(root, 'documentacion', 'logs_cotizacion');
    const tasksFilePath = path.join(root, 'documentacion', 'tasks.json');

    console.log("-----------------------------------------");
    console.log("🚀 AGENT_SYNC_PROTOCOL_V5_AIR_CALIBRATION");
    console.log("📂 ESCANEANDO DIRECTORIO:", logsDir);

    if (!fs.existsSync(logsDir)) {
      console.error("❌ ERROR: No se encuentra la carpeta de logs en:", logsDir);
      return NextResponse.json({ error: "Directorio de logs no encontrado" }, { status: 404 });
    }

    // Leemos TODOS los archivos de la carpeta
    const files = await readdir(logsDir);
    
    // Filtramos solo los JSON (sin .slice, queremos los 16)
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    
    console.log(`📊 ARCHIVOS DETECTADOS: ${jsonFiles.length}`);

    const freshTasks: any[] = [];
    let processedCount = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(logsDir, file);
        const content = await readFile(filePath, 'utf8');
        
        if (!content.trim()) continue;

        const logData = JSON.parse(content);
        
        // Extraemos data del log
        const reportName = logData.report?.name || file.replace('.json', '');
        const totalHours = logData.quotation?.hours?.total || 0;

        // --- LÓGICA DE SEMÁFORO CALIBRADA ---
        let priorityValue: "NORMAL" | "ALTA" | "CRITICA" = "NORMAL";

        if (totalHours >= 55) {
          priorityValue = "CRITICA"; 
        } 
        else if (totalHours >= 28) {
          priorityValue = "ALTA"; 
        } 
        else {
          priorityValue = "NORMAL"; 
        }

        freshTasks.push({
          // Generamos ID único basado en el nombre y timestamp
          id: `trm_${processedCount}_${Date.now()}`,
          title: reportName.toUpperCase(),
          category: logData.category || "MIGRACION",
          priority: priorityValue,
          completed: false,
          metadata: logData 
        });

        processedCount++;
        console.log(`✅ [${processedCount}/${jsonFiles.length}] PROCESADO: ${reportName}`);

      } catch (err) {
        console.error(`❌ Error en archivo ${file}:`, err);
      }
    }

    // 💾 GUARDADO FÍSICO
    // Aseguramos que el directorio de destino exista
    const tasksDir = path.dirname(tasksFilePath);
    if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

    await writeFile(tasksFilePath, JSON.stringify(freshTasks, null, 2), 'utf8');
    
    console.log(`✨ SYNC EXITOSA: ${processedCount} tareas inyectadas en tasks.json`);
    console.log("-----------------------------------------");

    // 🚩 CLAVE: Devolvemos el ARRAY directamente para que el front lo muestre al toque
    return NextResponse.json(freshTasks);

  } catch (error: any) {
    console.error("🔥 FATAL_ERROR EN SYNC:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}