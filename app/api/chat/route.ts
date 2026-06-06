export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { StreamingTextResponse, OpenAIStream } from 'ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sectors = [
  { id: 'REQUIREMENTS', path: 'documentacion/requirements' },
  { id: 'WORK', path: 'documentacion/work' },
  { id: 'QA', path: 'documentacion/qa' },
  { id: 'KNOWLEDGE', path: 'documentacion/knowledge' },
  { id: 'PROMPTS', path: 'documentacion/prompts' },
  { id: 'LEGACY_TEST', path: 'documentacion/test' },
  { id: 'LEGACY_INPUTS', path: 'documentacion/logs_cotizacion' },
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();
    const isBasicInteraction = lastUserMessage.length < 10 &&
      (['hola', 'status', 'hey', 'inicio'].some(k => lastUserMessage.includes(k)));

    let contextFromDocs = "";
    const fileList: string[] = [];

    if (!isBasicInteraction) {
      const numericMatch = lastUserMessage.match(/\d+/);
      const targetExtension = lastUserMessage.includes('.js') ? '.js' :
        lastUserMessage.includes('.ts') ? '.ts' :
        lastUserMessage.includes('.tsx') ? '.tsx' :
        lastUserMessage.includes('.md') ? '.md' :
        lastUserMessage.includes('.json') ? '.json' : null;

      for (const sector of sectors) {
        const fullPath = path.resolve(process.cwd(), sector.path);
        if (!fs.existsSync(fullPath)) continue;

        const files = fs.readdirSync(fullPath);
        const matches = files.filter(f => {
          const fName = f.toLowerCase();
          const idMatch = numericMatch ? fName.includes(numericMatch[0]) : true;
          const extMatch = targetExtension ? fName.endsWith(targetExtension) : true;
          const nameMatch = lastUserMessage.includes(fName.split('.')[0]);
          return (idMatch || nameMatch) && extMatch;
        });

        for (const file of matches) {
          if (contextFromDocs.length > 65000) break;

          const filePath = path.join(fullPath, file);
          if (!fs.lstatSync(filePath).isFile()) continue;

          const content = fs.readFileSync(filePath, 'utf8');
          fileList.push(file);
          contextFromDocs += `
<WORKSPACE_OBJECT_ENTRY name="${file}" sector="${sector.id}">
${content}
</WORKSPACE_OBJECT_ENTRY>\n`;

          console.log(`[PagoTIC_Context_Load]: Inyectando ${file} (${content.length} bytes)`);
        }
      }
    }

    const systemPrompt = `MODE: IT_DEVELOPMENT_ASSISTANT.
OPERATOR_ID: MARTIN.

INSTRUCTIONS:
- You are Pago TIC IT Development Core, a senior technical assistant for software development in any language.
- Help with requirements, architecture, frontend, backend, QA, debugging, documentation, automation and technical planning.
- Use the provided <WORKSPACE_OBJECT_ENTRY> context when it is relevant, and clearly say when the answer depends on local context.
- If the operator asks for complete local file content and the file is present in context, return it in a code block.
- AMBIGUITY: If multiple files are detected (${fileList.join(', ')}), ask for clarification BEFORE processing.
- TEMPERATURE_LOCK: 0.0.

FILES_IN_WORKSPACE_BUFFER: ${fileList.join(' | ') || "NONE"}

CURRENT_DATA_STREAM:
${contextFromDocs || "WAITING_FOR_COMMANDS"}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.0,
      max_tokens: 8000,
      presence_penalty: -0.8,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error("PAGOTIC_CHAT_FAILURE:", error);
    return new Response("CHAT_SYSTEM_ERROR", { status: 500 });
  }
}
