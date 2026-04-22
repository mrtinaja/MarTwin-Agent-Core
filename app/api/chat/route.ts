import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// --- CONFIGURACIÓN DE INSTANCIA ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fuerza a que la ruta no use caché de Next.js y sea siempre dinámica
export const dynamic = 'force-dynamic';

// --- OPTIMIZACIÓN: CACHÉ EN MEMORIA (Fuera del handler) ---
let masterPromptCache: { content: string; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 15; // Refrescar cada 15 minutos

export async function POST(req: Request) {
  try {
    const { messages, data } = await req.json();
    const attachments = data?.manualAttachments || [];
    const lastUserMessage = messages[messages.length - 1].content.toUpperCase();

    const root = process.cwd();
    const docPath = path.join(root, 'documentacion');
    
    // 1. OBTENER REGLAS MAESTRAS (CON CACHÉ)
    let masterRules = "";
    const now = Date.now();

    if (masterPromptCache && (now - masterPromptCache.timestamp < CACHE_TTL)) {
      masterRules = masterPromptCache.content;
    } else {
      const htmlPromptPath = path.join(docPath, 'prompts', '_HTML.md');
      if (fs.existsSync(htmlPromptPath)) {
        masterRules = fs.readFileSync(htmlPromptPath, 'utf8');
        masterPromptCache = { content: masterRules, timestamp: now };
        console.log("⚡ [SYSTEM] Prompt maestro sincronizado desde disco.");
      }
    }

    // 2. INYECCIÓN DE CONTEXTO SELECTIVO (Ahorro de Tokens y Velocidad)
    let contextualData = "";
    
    // Solo escanea si detecta keywords de reportes o datos
    const needsContext = /CONR|DATA|INFO|QUOT|TEST|QUERY/.test(lastUserMessage);

    if (needsContext) {
      const targetFolders = ['desarrollo', 'cotizaciones', 'tests'];
      
      targetFolders.forEach(subDir => {
        const fullSubDir = path.join(docPath, subDir);
        if (fs.existsSync(fullSubDir)) {
          const files = fs.readdirSync(fullSubDir);
          files.forEach(file => {
            const fileNameOnly = file.split('.')[0].toUpperCase();
            // Si el mensaje menciona el nombre del archivo, lo inyectamos
            if (lastUserMessage.includes(fileNameOnly)) {
              const content = fs.readFileSync(path.join(fullSubDir, file), 'utf8');
              contextualData += `\n--- SOURCE_FILE: ${file} ---\n${content}\n`;
              console.log(`🎯 Contexto inyectado: ${file}`);
            }
          });
        }
      });
    }

    // 3. CONSTRUCCIÓN DEL PROMPT DE SISTEMA
    const systemPrompt = `Eres MarTwin Agent Core v5.0 // NEURAL_INTERFACE.
    Operas bajo protocolos de Zurich Santander.
    
    COLORES_CORPORATIVOS: Azul Petróleo (#08646e), Dorado Ocre (#e4b32b).
    
    REGLAS_ESTILO_INTERFAZ:
    ${masterRules}

    DATOS_LOCALES_INYECTADOS:
    ${contextualData || "No se requiere contexto adicional para esta consulta."}

    PROTOCOLO:
    - Respuestas quirúrgicas, técnicas y de alta eficiencia.
    - Usa siempre los colores #08646e y #e4b32b en sugerencias de UI.
    - Si el contexto inyectado contiene SQL, analízalo con rigor de DBA Oracle.`;

    // 4. PROCESAMIENTO DE IMÁGENES (Si existen)
    const imageFiles = attachments.filter((a: any) => a.contentType.startsWith('image/'));
    
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    if (imageFiles.length > 0) {
      chatMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: "Analiza esta captura usando los protocolos inyectados." },
          ...imageFiles.map((img: any) => ({
            type: 'image_url',
            image_url: { url: `data:${img.contentType};base64,${img.base64}` }
          }))
        ]
      } as any);
    }

   // 5. EJECUCIÓN CON STREAMING
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: chatMessages as any,
      temperature: 0.2,
    });

    // Forzamos el tipo a 'any' para evitar la colisión con los tipos de Azure
    const stream = OpenAIStream(response as any); 
    return new StreamingTextResponse(stream);
    // OpenAIStream transforma la respuesta en un flujo que useChat entiende
   

  } catch (error: any) {
    console.error("🔥 [CRITICAL_ERROR]:", error.message);
    return new Response(JSON.stringify({ 
      error: "Neural Link Interrupted", 
      details: error.message 
    }), { status: 500 });
  }
}