export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message): ChatMessage | null => {
      if (!message || typeof message !== "object") {
        return null;
      }

      const candidate = message as {
        role?: unknown;
        content?: unknown;
      };

      const role = candidate.role;
      const content = candidate.content;

      if (
        role !== "user" &&
        role !== "assistant" &&
        role !== "system"
      ) {
        return null;
      }

      if (typeof content !== "string" || !content.trim()) {
        return null;
      }

      return {
        role,
        content,
      };
    })
    .filter((message): message is ChatMessage => Boolean(message));
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: "Falta OPENAI_API_KEY.",
        },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        {
          error: "No autorizado",
        },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as {
      messages?: unknown;
    } | null;

    const messages = normalizeMessages(body?.messages);

    if (!messages.length) {
      return Response.json(
        {
          error: "No se recibieron mensajes válidos.",
        },
        { status: 400 }
      );
    }

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      stream: true,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Eres MarTwin Core. Especialista en análisis documental técnico para desarrollo IT general. Respondé en español claro, preciso y sin inventar información.",
        },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          controller.close();
        } catch (streamError) {
          console.error("PROCESS_DOC_STREAM_ERROR:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    console.error("PROCESS_DOC_ERROR:", message);

    return Response.json(
      {
        error: "ERROR_EN_PROCESAMIENTO_DOC",
        details: message,
      },
      { status: 500 }
    );
  }
}