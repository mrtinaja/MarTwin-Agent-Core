import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = body.text || "";

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            nombre_reporte: { type: SchemaType.STRING },
            descripcion_funcional: { type: SchemaType.STRING },
            detalles_funcionales: { type: SchemaType.STRING },
            campo_tipo_lista: { type: SchemaType.STRING },
            consulta_original: { type: SchemaType.STRING },
            consulta_actual_y_cambios: { type: SchemaType.STRING },
          },
          required: ["nombre_reporte", "descripcion_funcional"]
        }
      }
    });

    // PROMPT OPTIMIZADO PARA ZURICH SANTANDER
    const prompt = `Actúa como un experto en migración de Oracle Reports a Node.js. 
    Analiza este historial técnico y genera la documentación para el reporte detectado.
    
    CRÍTICO: Busca códigos de reporte como CAJR, CONR, SINR, VIDR o CARR. 
    En 'consulta_original' busca el SQL legacy. 
    En 'consulta_actual_y_cambios' resume los ajustes realizados para Next.js (como cambios en JOINs o filtros de fechas).

    TEXTO TÉCNICO:
    ${text.substring(0, 10000)}`; 

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("🔥 FALLO EN EXTRACCIÓN:", error.message);
    
    // MODO EMERGENCIA: REGEX AMPLIADO PARA TODAS LAS FAMILIAS
    // Ahora detecta CAJR, CARR, CONR, SINR, VIDR
    const reportNameMatch = text.match(/(CAJR|CARR|CONR|SINR|VIDR)\d+/i);
    const reportName = reportNameMatch ? reportNameMatch[0].toUpperCase() : "REPORTE_MIGRACION";

    return NextResponse.json({
      nombre_reporte: reportName,
      descripcion_funcional: "Análisis automático de emergencia. La estructura del chat contenía información técnica compleja.",
      detalles_funcionales: "Contenido recuperado: " + text.substring(0, 500) + "...",
      campo_tipo_lista: "Verificar parámetros de entrada en el historial de migración.",
      consulta_original: "Consultar archivos .json de auditoría previos.",
      consulta_actual_y_cambios: "Lógica pendiente de revisión por paridad con el owner."
    });
  }
}