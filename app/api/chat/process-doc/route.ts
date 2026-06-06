export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: 'Eres Pago TIC Core. Especialista en analisis documental tecnico para desarrollo IT general.' },
        ...messages
      ],
      temperature: 0.1,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error("PROCESS_DOC_ERROR:", error.message);
    return new Response(JSON.stringify({ error: "ERROR_EN_PROCESAMIENTO_DOC" }), { status: 500 });
  }
}
