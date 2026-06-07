export const dynamic = "force-dynamic";
export const revalidate = 0;

import OpenAI from "openai";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sectors = [
  { id: "REQUIREMENTS", path: "documentacion/requirements" },
  { id: "WORK", path: "documentacion/work" },
  { id: "QA", path: "documentacion/qa" },
  { id: "KNOWLEDGE", path: "documentacion/knowledge" },
  { id: "PROMPTS", path: "documentacion/prompts" },
  { id: "LEGACY_TEST", path: "documentacion/test" },
  { id: "LEGACY_INPUTS", path: "documentacion/logs_cotizacion" },
];

type PagoTicMessage = {
  id?: string;
  role: "system" | "user" | "assistant";
  content: unknown;
};

type UploadedFile = {
  name: string;
  type: string;
  dataUrl: string;
};

function getMessageText(message: PagoTicMessage | undefined): string {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part.text || "";
        return "";
      })
      .join(" ");
  }

  return "";
}

function shouldSkipLocalContext(lastUserMessage: string) {
  const cleanMessage = lastUserMessage.trim().toLowerCase();

  return (
    cleanMessage.length < 10 &&
    ["hola", "status", "hey", "inicio"].some((keyword) =>
      cleanMessage.includes(keyword)
    )
  );
}

function getTargetExtension(lastUserMessage: string) {
  if (lastUserMessage.includes(".tsx")) return ".tsx";
  if (lastUserMessage.includes(".ts")) return ".ts";
  if (lastUserMessage.includes(".js")) return ".js";
  if (lastUserMessage.includes(".md")) return ".md";
  if (lastUserMessage.includes(".json")) return ".json";
  if (lastUserMessage.includes(".html")) return ".html";
  if (lastUserMessage.includes(".css")) return ".css";

  return null;
}

function isImageFile(file: UploadedFile) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)
  );
}

function isPdfFile(file: UploadedFile) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function normalizeDataUrl(file: UploadedFile) {
  if (file.dataUrl.startsWith("data:")) {
    return file.dataUrl;
  }

  const mimeType = file.type || "application/octet-stream";
  return `data:${mimeType};base64,${file.dataUrl}`;
}

function buildTranscript(messages: PagoTicMessage[]) {
  return messages
    .map((message) => {
      const role = message.role.toUpperCase();
      const content = getMessageText(message);
      return `${role}: ${content}`;
    })
    .join("\n\n");
}

function buildResponseInput(
  messages: PagoTicMessage[],
  uploadedFiles: UploadedFile[],
  systemPrompt: string
) {
  const transcript = buildTranscript(messages);
  const lastMessage = messages[messages.length - 1];
  const lastUserText = getMessageText(lastMessage);

  const userContent: any[] = [
    {
      type: "input_text",
      text: `
CONVERSATION_TRANSCRIPT:
${transcript || "NO_PREVIOUS_MESSAGES"}

CURRENT_USER_REQUEST:
${lastUserText || "Analizá el archivo adjunto y respondé técnicamente."}
      `.trim(),
    },
  ];

  for (const file of uploadedFiles) {
    if (isImageFile(file)) {
      userContent.push({
        type: "input_image",
        image_url: normalizeDataUrl(file),
        detail: "high",
      });
    }

    if (isPdfFile(file)) {
      userContent.push({
        type: "input_file",
        filename: file.name || "documento.pdf",
        file_data: normalizeDataUrl(file),
      });
    }
  }

  return [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text: systemPrompt,
        },
      ],
    },
    {
      role: "user",
      content: userContent,
    },
  ];
}

function createTextStreamFromResponsesAPI(response: AsyncIterable<any>) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of response) {
          if (event.type === "response.output_text.delta" && event.delta) {
            controller.enqueue(encoder.encode(event.delta));
          }

          if (event.type === "error") {
            console.error("PAGOTIC_RESPONSES_STREAM_ERROR:", event);
          }
        }
      } catch (error) {
        console.error("PAGOTIC_STREAM_FAILURE:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages: PagoTicMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const uploadedFiles: UploadedFile[] = Array.isArray(body.uploadedFiles)
      ? body.uploadedFiles
      : [];

    const imageFiles = uploadedFiles.filter(isImageFile);
    const pdfFiles = uploadedFiles.filter(isPdfFile);

    const lastMessage = messages[messages.length - 1];
    const lastUserMessage = getMessageText(lastMessage).toLowerCase();

    const hasImage = imageFiles.length > 0;
    const hasPdf = pdfFiles.length > 0;
    const hasFile = uploadedFiles.length > 0;

    const isBasicInteraction = shouldSkipLocalContext(lastUserMessage);

    console.log("[PagoTIC_File_Debug]", {
      uploadedFiles: uploadedFiles.length,
      imageFiles: imageFiles.length,
      pdfFiles: pdfFiles.length,
      names: uploadedFiles.map((file) => file.name),
      types: uploadedFiles.map((file) => file.type),
    });

    let contextFromDocs = "";
    const fileList: string[] = [];

    if (!isBasicInteraction) {
      const numericMatch = lastUserMessage.match(/\d+/);
      const targetExtension = getTargetExtension(lastUserMessage);

      for (const sector of sectors) {
        const fullPath = path.resolve(process.cwd(), sector.path);

        if (!fs.existsSync(fullPath)) continue;

        const files = fs.readdirSync(fullPath);

        const matches = files.filter((file) => {
          const fileName = file.toLowerCase();
          const fileNameWithoutExtension = fileName.split(".")[0];

          const idMatch = numericMatch
            ? fileName.includes(numericMatch[0])
            : true;

          const extMatch = targetExtension
            ? fileName.endsWith(targetExtension)
            : true;

          const nameMatch = lastUserMessage.includes(fileNameWithoutExtension);

          return (idMatch || nameMatch) && extMatch;
        });

        for (const file of matches) {
          if (contextFromDocs.length > 65000) break;

          const filePath = path.join(fullPath, file);

          if (!fs.lstatSync(filePath).isFile()) continue;

          const content = fs.readFileSync(filePath, "utf8");

          fileList.push(file);

          contextFromDocs += `
<WORKSPACE_OBJECT_ENTRY name="${file}" sector="${sector.id}">
${content}
</WORKSPACE_OBJECT_ENTRY>\n`;

          console.log(
            `[PagoTIC_Context_Load]: Inyectando ${file} (${content.length} bytes)`
          );
        }
      }
    }

    const uploadedAssetsList =
      uploadedFiles
        .map(
          (file, index) =>
            `- ASSET_${index + 1}: name="${file.name}", type="${file.type}"`
        )
        .join("\n") || "NONE";

    const validImageAssetNames =
      imageFiles.map((file) => `"${file.name}"`).join(", ") || "NONE";

    const systemPrompt = `MODE: IT_DEVELOPMENT_ASSISTANT.
OPERATOR_ID: MARTIN.

CORE_INSTRUCTIONS:
- You are Pago TIC IT Development Core, a senior technical assistant for software development in any language.
- Help with requirements, architecture, frontend, backend, QA, debugging, documentation, automation and technical planning.
- Use the provided <WORKSPACE_OBJECT_ENTRY> context when relevant.
- If the operator asks for complete local file content and the file is present in context, return it in a code block.
- AMBIGUITY: If multiple workspace files are detected (${fileList.join(", ")}), ask for clarification BEFORE processing.
- TEMPERATURE_LOCK: 0.0.

ANTI_HALLUCINATION_RULES:
- Do not invent visible content, labels, data, names, numbers, logos, icons, colors or layout elements.
- Reproduce only what is present, visible or strongly inferable from the attached file.
- If something is unreadable, missing or approximate, say it explicitly.
- If an exact uploaded asset is available, reference it as an image instead of redrawing it.
- Do not invent image filenames.
- Do not reference local image paths unless the filename exists in UPLOADED_ASSETS.
- Valid image src values are ONLY:
  1. exact uploaded asset filenames listed in UPLOADED_ASSETS;
  2. inline SVG;
  3. CSS-only shapes;
  4. remote HTTPS URLs only if present in the source;
  5. data URLs generated by the preview system.
- Valid uploaded image filenames are: ${validImageAssetNames}.
- If an icon is not uploaded, recreate it with inline SVG or CSS, never with src="email-icon.png", src="phone-icon.png", src="web-icon.png", src="icon.png" or similar invented files.
- Never generate a broken local image path.
- Do not replace a complex logo with a generic shape.
- Do not redesign. Do not modernize. Do not beautify.
- Match the source more than aesthetic preferences.

FILE_INPUT_MODE:
- The operator may attach images or PDFs.
- Supported files include .jpg, .jpeg, .png, .webp, .gif and .pdf.
- If PDF_ATTACHED is YES, analyze the PDF content.
- If the PDF contains screens, layouts, forms, reports or credentials, generate HTML and CSS only for what is visible/detectable.
- If the PDF contains documentation, summarize and extract actionable technical points.
- If a file type cannot be interpreted visually, explain the limitation.

ASSET_USAGE_RULES:
- If the attached file is a logo, brand mark, photo, icon, illustration, or complex bitmap asset, do not recreate it with CSS shapes.
- Use the uploaded asset as an image in the generated HTML.
- Reference uploaded assets by their exact filename in src, for example: <img src="logo_miweb.png" alt="Logo" />.
- The preview renderer will resolve that filename to the real uploaded data URL.
- Preserve original aspect ratio, visible size, position and spacing.
- Only recreate with CSS the surrounding layout, text, background and containers.
- For contact icons or small UI icons not available as uploaded assets, use inline SVG directly in the HTML or CSS-only shapes.
- Never use missing external icon files.
- If the uploaded file is a logo, use it exactly by filename.

VISUAL_REPLICATION_MODE:
- If IMAGE_ATTACHED is YES or the PDF contains visual pages, analyze visually with high precision.
- The goal is to recreate the screen as close as possible, not to redesign it.
- Preserve:
  - original aspect ratio,
  - viewport type,
  - visual hierarchy,
  - spacing,
  - margins,
  - rounded corners,
  - typography scale,
  - font weight,
  - colors,
  - gradients,
  - shadows,
  - borders,
  - alignment,
  - button sizes,
  - card proportions,
  - mobile/desktop proportions,
  - browser/status bars if visible.
- Detect whether the source is mobile or desktop.
- For mobile screenshots, generate a 390px wide canvas unless the source clearly suggests another width.
- For mobile browser screenshots, recreate the complete mobile viewport, including browser/status bar approximation, not only the inner card.
- Do not place a mobile card inside a desktop canvas unless the screenshot itself is desktop.
- Match card size relative to viewport.
- Preserve left/right/center alignment exactly as shown.
- Do not center all fields unless the original is centered.
- Use fixed pixel dimensions when they improve fidelity.
- Use responsive CSS only when it does not break the captured proportions.
- For credentials/cards, preserve member-data alignment, button row positions, legal text location and back button size/radius.
- If exact assets are unavailable, build the closest approximation possible using SVG/CSS, but do not invent filenames.

OUTPUT_FORMAT_FOR_VISUAL_FILES:
## HTML

\`\`\`html
...
\`\`\`

## CSS

\`\`\`css
...
\`\`\`

## Control visual

- Formato detectado:
- Viewport usado:
- Medidas principales:
- Colores principales:
- Tipografía aproximada:
- Assets usados:
- Elementos aproximados:
- Elementos no detectables:

FILES_IN_WORKSPACE_BUFFER: ${fileList.join(" | ") || "NONE"}

FILE_ATTACHED: ${hasFile ? "YES" : "NO"}
IMAGE_ATTACHED: ${hasImage ? "YES" : "NO"}
PDF_ATTACHED: ${hasPdf ? "YES" : "NO"}

UPLOADED_ASSETS:
${uploadedAssetsList}

CURRENT_DATA_STREAM:
${contextFromDocs || "WAITING_FOR_COMMANDS"}`;

    const input = buildResponseInput(messages, uploadedFiles, systemPrompt);

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: input as any,
      temperature: 0,
      max_output_tokens: 8000,
      stream: true,
    });

    const stream = createTextStreamFromResponsesAPI(response as any);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("PAGOTIC_CHAT_FAILURE:", error);

    return new Response("CHAT_SYSTEM_ERROR", {
      status: 500,
    });
  }
}