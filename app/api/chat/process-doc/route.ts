export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
// Asegúrate que esta ruta sea la correcta en tu estructura
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Validación de seguridad básica
    if (!session) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { messages } = await req.json();

    // Lógica de procesamiento de documentos...
    // (Aquí va tu lógica de RAG o procesamiento de texto)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: 'Eres MarTwin Core. Especialista en análisis documental de Zurich Santander.' },
        ...messages
      ],
      temperature: 0.1,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error(">> PROCESS_DOC_ERROR:", error.message);
    return new Response(JSON.stringify({ error: "ERROR_EN_PROCESAMIENTO_DOC" }), { status: 500 });
  }
}