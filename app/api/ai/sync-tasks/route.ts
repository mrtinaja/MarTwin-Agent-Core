import { NextResponse } from 'next/server';
import { writeFile, readFile, readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    const root = process.cwd();
    const logsDir = path.join(root, 'app', 'documentacion', 'logs_cotizacion');
    const tasksFilePath = path.join(root, 'app', 'documentacion', 'tasks.json');

    console.log("-----------------------------------------");
    console.log("🚀 AGENT_SYNC_PROTOCOL_V5_AIR_CALIBRATION");
    console.log("📂 ESCANEANDO:", logsDir);

    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ error: "Directorio de logs no encontrado" }, { status: 404 });
    }

    const files = await readdir(logsDir);
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    
    // Reconstrucción Limpia: Generamos la lista de cero para evitar duplicados o errores de nombre
    const freshTasks: any[] = [];
    let processedCount = 0;

    for (const file of jsonFiles) {
      try {
        const content = await readFile(path.join(logsDir, file), 'utf8');
        if (!content.trim()) continue;

        const logData = JSON.parse(content);
        
        // Priorizar el nombre que viene dentro del JSON
        const reportName = logData.report?.name || file.replace('.json', '');
        const totalHours = logData.quotation?.hours?.total || 0;

        // --- LÓGICA DE SEMÁFORO CALIBRADA PARA DAR "AIRE" ---
        let priorityValue: "NORMAL" | "ALTA" | "CRITICA" = "NORMAL";

        if (totalHours >= 55) {
          // 🔴 CRITICA: Solo casos extremos (Caja, Mayores críticos con mucha inflación)
          priorityValue = "CRITICA"; 
        } 
        else if (totalHours >= 28) {
          // 🟡 ALTA: Complejidad media/alta (Mayores detallados, procesos contables)
          priorityValue = "ALTA"; 
        } 
        else {
          // 🟢 NORMAL: Complejidad baja/media (Libro Diario, Siniestros, Listados)
          // Entran todos los de 17h a 27h para que el dashboard se vea "saludable"
          priorityValue = "NORMAL"; 
        }

        freshTasks.push({
          id: `trm_${Date.now()}_${processedCount}`,
          title: reportName,
          category: "MIGRACION",
          priority: priorityValue,
          completed: false,
          metadata: logData 
        });

        processedCount++;
        console.log(`✅ PROCESADO: ${reportName} -> ${totalHours}h [${priorityValue}]`);

      } catch (err) {
        console.error(`❌ Error procesando archivo ${file}:`, err);
      }
    }

    // Escritura final en el núcleo de datos
    await writeFile(tasksFilePath, JSON.stringify(freshTasks, null, 2), 'utf8');
    
    console.log(`✨ SYNC FINALIZADA. Total en Dashboard: ${processedCount}`);
    console.log("-----------------------------------------");

    return NextResponse.json({ 
      status: "OK", 
      processed: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("🔥 FATAL_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}