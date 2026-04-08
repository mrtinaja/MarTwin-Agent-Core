import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 1. LECTURA DE CONTEXTO (Optimizada)
    const root = process.cwd();
    const docsPath = path.join(root, 'documentacion');
    let context = "";

    if (fs.existsSync(docsPath)) {
      const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      context = files.map(f => {
        const content = fs.readFileSync(path.join(docsPath, f), 'utf8');
        // Solo mandamos los primeros 4000 caracteres de cada archivo para no explotar el token
        return `[FILE: ${f}]\n${content.substring(0, 4000)}`;
      }).join('\n\n');
    }

    // 2. LÓGICA DE SWITCHING (Si el contexto es muy largo, vamos a Gemini)
    const approximateTokens = context.length / 4; // Estimación rápida
    
    if (approximateTokens > 12000) {
      console.log("🚀 CONTEXTO GRANDE: Switcheando a Gemini 1.5 Flash...");
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Eres MarTwin Agent Core. Contexto de ingeniería:\n${context}\n\nPregunta: ${messages[messages.length - 1].content}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Devolvemos una respuesta compatible con el stream de useChat
      return new Response(text);
    }

    // 3. SI EL CONTEXTO ES MANEJABLE, SEGUIMOS CON OPENAI (Stream)
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        { role: 'system', content: `Eres MarTwin Agent Core. Contexto:\n${context}` },
        ...messages
      ],
    });

    const stream = OpenAIStream(response as any);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error("🔥 ERROR EN CHAT:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}