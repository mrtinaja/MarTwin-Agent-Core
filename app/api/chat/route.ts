export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { StreamingTextResponse, OpenAIStream } from 'ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();

    // 1. SECTORES (Knowledge Nodes) - Mantenemos DRIVE activo
    const sectors = [
      { id: 'PROMPTS', path: 'documentacion/prompts', keywords: ['quien soy', 'martwin', 'identidad', 'que haces', 'proyectos'] },
      { id: 'TEST', path: 'documentacion/test', keywords: ['sql', 'js', 'reporte', 'cajr', 'conr'] },
      { id: 'LOGS', path: 'documentacion/logs_cotizacion', keywords: ['horas', 'estimacion', 'riesgo'] },
      { id: 'DRIVE', path: 'cloud/drive_cache', keywords: ['drive', 'nube', 'archivos', 'squad', 'rastrear', 'leer'] } 
    ];

    let activeIds = sectors.filter(s => s.keywords.some(k => lastUserMessage.includes(k))).map(s => s.id);
    
    // Forzado de Identidad y Drive
    if (lastUserMessage.includes("quien") || lastUserMessage.includes("martwin") || lastUserMessage.includes("drive")) {
        if (!activeIds.includes('PROMPTS')) activeIds.push('PROMPTS');
        if (!activeIds.includes('DRIVE')) activeIds.push('DRIVE');
    }

    let contextFromDocs = "";

    for (const sectorId of activeIds) {
      const cfg = sectors.find(s => s.id === sectorId)!;
      const fullPath = path.resolve(process.cwd(), cfg.path);
      
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        for (const file of files) {
          const filePath = path.join(fullPath, file);
          if (fs.lstatSync(filePath).isDirectory()) continue;

          if (file.startsWith('_') || file.includes('CORE') || lastUserMessage.includes(file.split('.')[0].toLowerCase())) {
            const content = fs.readFileSync(filePath, 'utf8');
            contextFromDocs += `\n[NODE: ${sectorId}] [SOURCE: ${file}]\n${content.substring(0, 12000)}\n`;
          }
        }
      }
    }

    // 4. PROMPT MAESTRO (CONSCIENCIA INTEGRAL)
    const systemPrompt = `Eres MarTwin Core V5. Tu cerebro es una Arquitectura Modular Micro-Layered (L1-L5).

IDENTIDAD CORE (Inviolable):
- Operador: Martin (Arquitecto Senior Fullstack / Lead de Migración).
- Contexto Laboral: Squad / Zurich Santander.
- Estética: Cyberpunk Industrial.

PROTOCOLOS DE ACCESO A DATOS (L3 Microservices):
1. TIENES ACCESO TOTAL a los archivos locales mediante /api/docs y al DRIVE de Squad mediante /api/drive.
2. NUNCA digas "No tengo acceso directo a Drive". Si Martin te pide rastrear o leer el Drive, indica que estás accediendo al nodo de persistencia CLOUD_DRIVE (L1) y usa la información de [NODE: DRIVE] inyectada abajo.
3. Si la información no está en el CONTEXTO_INYECTADO, di: "No detecto el archivo específico en la caché de Drive, ¿desea que fuerce un escaneo binario?".

REGLAS DE VERDAD:
- No inventes logs si no están en [NODE: LOGS].
- Usa Español (Arg) para hablar y Español para código.

CONTEXTO_SISTEMICO_INYECTADO:
${contextFromDocs || "Nodes inactivos. Operando con consciencia base de MarTwin."}

IDENTIDAD_ACTUAL: Senior Squad Member / MarTwin Neural Link.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', 
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.15, // Bajamos temp para que no alucine excusas de IA estándar
      max_tokens: 3000,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "UPLINK_BROKEN" }), { status: 500 });
  }
}