export const dynamic = "force-dynamic";
export const revalidate = 0;

import OpenAI from "openai";
import type {
  ResponseInput,
  ResponseInputContent,
  Response as OpenAIResponse,
} from "openai/resources/responses/responses";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const aiProvider = (process.env.AI_PROVIDER || "openai")
  .trim()
  .toLowerCase();

const enableGeminiFallback =
  (process.env.ENABLE_GEMINI_FALLBACK || "true").trim().toLowerCase() !==
  "false";

const enableOpenRouterFallback =
  (process.env.ENABLE_OPENROUTER_FALLBACK || "true").trim().toLowerCase() !==
  "false";

const enableOpenRouterVisualFallback =
  (process.env.ENABLE_OPENROUTER_VISUAL_FALLBACK || "true")
    .trim()
    .toLowerCase() !== "false";

const openaiApiKey = (process.env.OPENAI_API_KEY || "")
  .trim()
  .replace(/^["']|["']$/g, "");

const openai = new OpenAI({
  apiKey: openaiApiKey || "missing-openai-key",
});

const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

const visualOutputTokenLimit = Number(
  process.env.OPENAI_VISUAL_MAX_OUTPUT_TOKENS || 9000
);

const textOutputTokenLimit = Number(
  process.env.OPENAI_TEXT_MAX_OUTPUT_TOKENS || 6000
);

const imageDetail = (
  process.env.OPENAI_IMAGE_DETAIL || "auto"
) as "low" | "high" | "auto";

const geminiApiKey = (
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  ""
)
  .trim()
  .replace(/^["']|["']$/g, "");

const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

const openRouterApiKey = (process.env.OPENROUTER_API_KEY || "")
  .trim()
  .replace(/^["']|["']$/g, "");

const openRouterModel = (
  process.env.OPENROUTER_MODEL || "openrouter/free"
).trim();

const defaultOpenRouterModelList = [openRouterModel, "openrouter/free"].filter(
  (model, index, array) => array.indexOf(model) === index
);

const openRouterModelList = (
  process.env.OPENROUTER_MODEL_LIST || defaultOpenRouterModelList.join(",")
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean)
  .filter((model, index, array) => array.indexOf(model) === index);

const defaultOpenRouterVisionModelList = [
  "qwen/qwen-2.5-vl-72b-instruct:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
];

const openRouterVisionModelList = (
  process.env.OPENROUTER_VISION_MODEL_LIST ||
  defaultOpenRouterVisionModelList.join(",")
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean)
  .map((model) =>
    model === "qwen/qwen2.5-vl-72b-instruct:free"
      ? "qwen/qwen-2.5-vl-72b-instruct:free"
      : model
  )
  .filter((model, index, array) => array.indexOf(model) === index);

const openRouterSiteUrl =
  process.env.OPENROUTER_SITE_URL || "http://localhost:3000";

const openRouterAppName =
  process.env.OPENROUTER_APP_NAME || "MarTwin AI Assistant";

const sectors = [
  { id: "REQUIREMENTS", path: "documentacion/requirements" },
  { id: "WORK", path: "documentacion/work" },
  { id: "QA", path: "documentacion/qa" },
  { id: "KNOWLEDGE", path: "documentacion/knowledge" },
  { id: "PROMPTS", path: "documentacion/prompts" },
  { id: "LEGACY_TEST", path: "documentacion/test" },
  { id: "LEGACY_INPUTS", path: "documentacion/logs_cotizacion" },
];

type MarTwinMessage = {
  id?: string;
  role: "system" | "user" | "assistant";
  content: unknown;
};

type UploadedFile = {
  name: string;
  type: string;
  dataUrl: string;
};

type FileTaskMode = "analysis" | "visual";

type TextContentPart = {
  type?: unknown;
  text?: unknown;
};

type OpenAIOutputItem = {
  content?: Array<{
    text?: string;
    type?: string;
  }>;
};

type OpenRouterContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
        detail?: "low" | "high" | "auto";
      };
    }
  | {
      type: "file";
      file: {
        filename: string;
        file_data: string;
      };
    };

type OpenRouterResponsePayload = {
  id?: string;
  model?: string;
  provider?: string;
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      provider_name?: string;
      raw?: string;
      retry_after_seconds?: number;
      retry_after_seconds_raw?: number;
    };
  };
  choices?: Array<{
    message?: {
      role?: string;
      content?: unknown;
      reasoning?: unknown;
    };
    delta?: {
      content?: unknown;
      reasoning?: unknown;
    };
    text?: unknown;
    finish_reason?: string;
  }>;
};

type OpenRouterErrorPayload = {
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      retry_after_seconds?: number;
      retry_after_seconds_raw?: number;
      provider_name?: string;
      raw?: string;
    };
  };
  user_id?: string;
};

type GeminiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type GeminiTextPart = {
  text: string;
};

type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function isTextContentPart(part: unknown): part is TextContentPart {
  return typeof part === "object" && part !== null;
}

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "";

  const code = (error as { code?: unknown }).code;
  const type = (error as { type?: unknown }).type;

  if (typeof code === "string") return code;
  if (typeof type === "string") return type;

  return "";
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) return null;

  const status = (error as { status?: unknown }).status;

  return typeof status === "number" ? status : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") return message;
  }

  return "";
}

function isOpenAiFallbackError(error: unknown) {
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === "insufficient_quota" ||
    code === "rate_limit_exceeded" ||
    code === "billing_hard_limit_reached" ||
    message.includes("missing openai_api_key") ||
    message.includes("openai_empty_response") ||
    message.includes("insufficient_quota") ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("rate limit")
  );
}

function isGeminiFallbackError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("gemini_empty_response") ||
    message.includes("gemini_http_") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("unavailable")
  );
}

function isQuotaError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    getErrorStatus(error) === 429 ||
    code === "insufficient_quota" ||
    code === "rate_limit_exceeded" ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
}

function getMessageText(message: MarTwinMessage | undefined): string {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part: unknown) => {
        if (typeof part === "string") return part;

        if (
          isTextContentPart(part) &&
          part.type === "text" &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

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

function getFastLocalReply(lastUserMessage: string) {
  const cleanMessage = lastUserMessage.trim().toLowerCase();
  const isShortGreeting =
    cleanMessage.length <= 40 &&
    /^(hola+|buenas|hey|hi|hello)\b/i.test(cleanMessage) &&
    !/\b(necesito|genera|generar|arma|armar|crea|crear|revisa|revisar|documenta|documentar|template|plantilla|archivo|codigo|c[oó]digo)\b/i.test(
      cleanMessage
    );

  if (isShortGreeting) {
    return "Hola, Martin. Estoy listo. Decime que queres armar, revisar o documentar.";
  }

  if (/^(status|estado|inicio)$/i.test(cleanMessage)) {
    return "Sistema en linea. Puedo ayudarte con desarrollo, documentacion, QA, debugging y automatizacion.";
  }

  return "";
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

function isDocsSquadTemplateRequest(lastUserMessage: string) {
  const wantsTemplateDocs =
    /\b(template|plantilla)\b/i.test(lastUserMessage) &&
    /\b(documentacion|documentaci[oÃ³]n|docs?)\b/i.test(lastUserMessage);
  const wantsDownloadableReport =
    /\b(informe|documento|documentacion|documentaci[oÃ³]n|docs?)\b/i.test(
      lastUserMessage
    ) &&
    /\b(descargar|download|bajar|docx|word|template|plantilla)\b/i.test(
      lastUserMessage
    );

  return wantsTemplateDocs || wantsDownloadableReport;
}

function isZurichMigrationReportRequest(lastUserMessage: string) {
  return (
    /\b(zuric|zurich|zurich santander)\b/i.test(lastUserMessage) &&
    /\b(migracion|migraci[oÃ³]n|migrados?|realizada|reportes?)\b/i.test(
      lastUserMessage
    ) &&
    /\b(informe|resumen|estado|balance|documentacion|documentaci[oÃ³]n|descargar|download|docx|word)\b/i.test(
      lastUserMessage
    )
  );
}
function isDetailedReportRequest(lastUserMessage: string) {
  return /\b(detallado|minucioso|completo|extenso|profundo|exhaustivo|amplio|paso a paso)\b/i.test(
    lastUserMessage
  );
}

function getTargetNumericFilter(lastUserMessage: string) {
  const quantityMatch = lastUserMessage.match(
    /\b\d+\s+(?:reportes?|migraciones?|objetos?|archivos?)\b/i
  );

  if (quantityMatch) return null;

  return lastUserMessage.match(/\d+/);
}

function extractObjectKeys(block: string, limit = 8) {
  return Array.from(block.matchAll(/^\s*([A-Z0-9_]+)\s*:/gm))
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, limit);
}

function getReportDescription(content: string) {
  const inlineMatch = content.match(/description\s*:\s*["'`]([\s\S]+?)["'`]/);

  if (inlineMatch?.[1]) {
    return inlineMatch[1].replace(/\s+/g, " ").trim();
  }

  return "Reporte migrado dentro del alcance Zurich Santander.";
}

function buildZurichReportInventoryContext() {
  const reportsDir = path.resolve(process.cwd(), "documentacion", "test");

  if (!fs.existsSync(reportsDir)) return "";

  const files = fs
    .readdirSync(reportsDir)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .filter((file) => path.basename(file, ".md").toUpperCase() !== "TESTEO")
    .sort();

  const entries = files.map((file, index) => {
    const filePath = path.join(reportsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const name = path.basename(file, ".md");
    const description = getReportDescription(content).slice(0, 280);
    const paramsBlock =
      content.match(/params\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
    const queriesBlock =
      content.match(/queries\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
    const params = extractObjectKeys(paramsBlock, 8);
    const queries = extractObjectKeys(queriesBlock, 10);
    const hasLayout = /\blayout\s*:/i.test(content);
    const hasSql = /SELECT\s+/i.test(content);
    const signals = [
      hasSql ? "SQL Oracle migrado" : "",
      hasLayout ? "layout HTML/PDF" : "",
    ].filter(Boolean);

    return [
      `#${index + 1} ${name}`,
      `Descripcion: ${description}`,
      `Parametros: ${params.join(", ") || "sin parametros detectados"}`,
      `Queries: ${queries.join(", ") || "queries embebidas/no detectadas"}`,
      `Seniales tecnicas: ${signals.join(", ") || "modelo funcional migrado"}`,
    ].join("\n");
  });

  return `
<ZURICH_REPORT_INVENTORY total="${files.length}">
${entries.join("\n\n")}
</ZURICH_REPORT_INVENTORY>`;
}

function isExplicitArtifactGenerationRequest(lastUserMessage: string) {
  if (isDocsSquadTemplateRequest(lastUserMessage)) {
    return false;
  }

  const asksForMockPreview =
    /\b(mock|mockup|mockea|mockear|mockeando|preview|vista previa|visualiza|visualizar|render|renderiza|renderizar)\b/i.test(
      lastUserMessage
    );

  if (asksForMockPreview) {
    return true;
  }

  const referencesRenderableTemplate =
    /\b(template|plantilla|layout|html|css|style\.md|cajr\d+|\.md|sql|query|queries|reporte|report|datos|data)\b/i.test(
      lastUserMessage
    );

  if (asksForMockPreview && referencesRenderableTemplate) {
    return true;
  }

  const hasArtifactKeyword =
    /\b(cv|curriculum|curriculo|curriculum vitae|tarjeta personal|tarjeta|card|flyer|poster|afiche|banner|invitacion|invitacion|presentacion|presentacion|documento|doc|docx|word|pdf|png|svg|jpg|jpeg|gif|html|css|preview|vista previa|vista|pantalla|formulario|tabla|reporte|maqueta|wireframe|mockup|mock|template|plantilla|layout)\b/i.test(
      lastUserMessage
    );

  const hasCreationIntent =
    /\b(arma|armar|crea|crear|genera|generar|hace|hacer|disena|disenar|diseña|diseñar|converti|convertir|exporta|exportar|devuelve|devolver|responde|responder|prepara|preparar|mockea|mockear|mockeando|maqueta|maquetar|visualiza|visualizar)\b/i.test(
      lastUserMessage
    );

  return hasArtifactKeyword && hasCreationIntent;
}

function isExplicitWorkspaceContextRequest(lastUserMessage: string) {
  return /\b(workspace|documentacion|documentación|archivo local|repo|codigo|código|tsx|ts|js|json|md|ruta|proyecto|contexto local)\b/i.test(
    lastUserMessage
  );
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

function dataUrlToGeminiInlineData(file: UploadedFile) {
  const dataUrl = normalizeDataUrl(file);
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);

  if (!match) {
    return {
      mimeType: file.type || "application/octet-stream",
      data: file.dataUrl,
    };
  }

  return {
    mimeType: match[1] || file.type || "application/octet-stream",
    data: match[2],
  };
}

function buildTranscript(messages: MarTwinMessage[]) {
  const compactMessages = messages.slice(-6);

  const transcript = compactMessages
    .map((message) => {
      const role = message.role.toUpperCase();
      const content = getMessageText(message).slice(0, 2500);

      return `${role}: ${content}`;
    })
    .join("\n\n");

  return transcript.slice(-12000);
}

function buildUserPrompt(messages: MarTwinMessage[]) {
  const transcript = buildTranscript(messages);
  const lastMessage = messages[messages.length - 1];
  const lastUserText = getMessageText(lastMessage);

  return `
CONVERSATION_TRANSCRIPT:
${transcript || "NO_PREVIOUS_MESSAGES"}

CURRENT_USER_REQUEST:
${lastUserText || "Analizá el archivo adjunto y respondé técnicamente."}
  `.trim();
}

function buildUploadedFileInputParts(uploadedFiles: UploadedFile[]) {
  const fileParts: ResponseInputContent[] = [];

  for (const file of uploadedFiles) {
    if (isImageFile(file)) {
      fileParts.push({
        type: "input_image",
        image_url: normalizeDataUrl(file),
        detail: imageDetail,
      });
    }

    if (isPdfFile(file)) {
      fileParts.push({
        type: "input_file",
        filename: file.name || "documento.pdf",
        file_data: normalizeDataUrl(file),
      });
    }
  }

  return fileParts;
}

function buildResponseInput(
  messages: MarTwinMessage[],
  uploadedFiles: UploadedFile[],
  systemPrompt: string
): ResponseInput {
  const userPrompt = buildUserPrompt(messages);

  const userContent: ResponseInputContent[] = [
    {
      type: "input_text",
      text: userPrompt,
    },
  ];

  userContent.push(...buildUploadedFileInputParts(uploadedFiles));

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

function buildOpenRouterUserContent(
  userPrompt: string,
  uploadedFiles: UploadedFile[]
): OpenRouterContentPart[] {
  const content: OpenRouterContentPart[] = [
    {
      type: "text",
      text: userPrompt,
    },
  ];

  for (const file of uploadedFiles) {
    if (isImageFile(file)) {
      content.push({
        type: "image_url",
        image_url: {
          url: normalizeDataUrl(file),
          detail: imageDetail,
        },
      });
    }

    if (isPdfFile(file)) {
      content.push({
        type: "file",
        file: {
          filename: file.name || "documento.pdf",
          file_data: normalizeDataUrl(file),
        },
      });
    }
  }

  return content;
}

function buildGeminiUserParts(
  userPrompt: string,
  uploadedFiles: UploadedFile[]
): GeminiPart[] {
  const parts: GeminiPart[] = [
    {
      text: userPrompt,
    },
  ];

  for (const file of uploadedFiles) {
    if (isImageFile(file) || isPdfFile(file)) {
      parts.push({
        inlineData: dataUrlToGeminiInlineData(file),
      });
    }
  }

  return parts;
}

function extractTextFromUnknownContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;

        if (
          typeof part === "object" &&
          part !== null &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }

        if (
          typeof part === "object" &&
          part !== null &&
          typeof (part as { content?: unknown }).content === "string"
        ) {
          return (part as { content: string }).content;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function getOpenAIResponseText(response: OpenAIResponse) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = response.output as OpenAIOutputItem[] | undefined;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .join("");
}

function extractGeminiText(payload: GeminiResponsePayload) {
  if (payload.error?.message) {
    return `GEMINI_ERROR: ${payload.error.message}`;
  }

  const candidate = payload.candidates?.[0];

  if (!candidate?.content?.parts?.length) {
    return "";
  }

  return candidate.content.parts.map((part) => part.text || "").join("");
}

function parseOpenRouterError(errorText: string): OpenRouterErrorPayload {
  try {
    return JSON.parse(errorText) as OpenRouterErrorPayload;
  } catch {
    return {};
  }
}

function shouldTryNextOpenRouterModel(status: number, errorText: string) {
  if ([404, 408, 409, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const parsed = parseOpenRouterError(errorText);
  const code = parsed.error?.code;
  const message = `${parsed.error?.message || ""} ${
    parsed.error?.metadata?.raw || ""
  }`.toLowerCase();

  return (
    code === 429 ||
    code === "429" ||
    code === 404 ||
    code === "404" ||
    code === "rate_limit_exceeded" ||
    message.includes("temporarily rate-limited") ||
    message.includes("no endpoints found") ||
    message.includes("no endpoints found that support image input") ||
    message.includes("unavailable")
  );
}

function getOpenRouterErrorMessage(status: number, errorText: string) {
  const parsed = parseOpenRouterError(errorText);

  const message = parsed.error?.message;
  const raw = parsed.error?.metadata?.raw;
  const provider = parsed.error?.metadata?.provider_name;
  const retryAfter =
    parsed.error?.metadata?.retry_after_seconds ??
    parsed.error?.metadata?.retry_after_seconds_raw;

  const parts = [
    `OPENROUTER_HTTP_${status}`,
    provider ? `Provider: ${provider}` : "",
    retryAfter ? `Retry after: ${Math.ceil(retryAfter)}s` : "",
    raw || message || errorText || "Unknown OpenRouter error",
  ].filter(Boolean);

  return parts.join(" | ");
}

function extractOpenRouterText(payload: OpenRouterResponsePayload) {
  if (payload.error?.message) {
    return `OPENROUTER_ERROR: ${payload.error.message}`;
  }

  const choice = payload.choices?.[0];

  if (!choice) return "";

  const messageContent = extractTextFromUnknownContent(choice.message?.content);
  const deltaContent = extractTextFromUnknownContent(choice.delta?.content);
  const textContent = extractTextFromUnknownContent(choice.text);

  if (messageContent) return messageContent;
  if (deltaContent) return deltaContent;
  if (textContent) return textContent;

  return "";
}

function getOpenRouterFinishReason(payload: OpenRouterResponsePayload) {
  return payload.choices?.[0]?.finish_reason || "";
}

function isOutputProbablyTruncated(outputText: string, finishReason = "") {
  const normalizedFinishReason = finishReason.toLowerCase();

  if (
    normalizedFinishReason.includes("length") ||
    normalizedFinishReason.includes("max") ||
    normalizedFinishReason.includes("token")
  ) {
    return true;
  }

  const htmlFenceCount = (outputText.match(/```html/gi) || []).length;
  const cssFenceCount = (outputText.match(/```css/gi) || []).length;
  const fenceCount = (outputText.match(/```/g) || []).length;

  if ((htmlFenceCount > 0 || cssFenceCount > 0) && fenceCount % 2 !== 0) {
    return true;
  }

  return false;
}

function stripMarkdownCodeFence(value: string) {
  return value
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractFencedBlock(value: string, language: string) {
  const closedRegex = new RegExp("```" + language + "\\s*([\\s\\S]*?)```", "i");
  const closedMatch = value.match(closedRegex);

  if (closedMatch?.[1]?.trim()) {
    return closedMatch[1].trim();
  }

  const openRegex = new RegExp("```" + language + "\\s*([\\s\\S]*)$", "i");
  const openMatch = value.match(openRegex);

  if (!openMatch?.[1]?.trim()) {
    return "";
  }

  const rest = openMatch[1];

  if (language.toLowerCase() === "html") {
    const cssStart = rest.search(
      /(?:^|\n)\s*(?:#{1,4}\s*)?(?:CSS|```css|Control visual|Control|Notas|Observaciones)\s*:?\s*/i
    );

    return stripMarkdownCodeFence(
      cssStart >= 0 ? rest.slice(0, cssStart) : rest
    );
  }

  const controlStart = rest.search(
    /(?:^|\n)\s*(?:#{1,4}\s*)?(?:Control visual|Control|Notas|Observaciones)\s*:?\s*/i
  );

  return stripMarkdownCodeFence(
    controlStart >= 0 ? rest.slice(0, controlStart) : rest
  );
}

function extractHeadingSection(value: string, heading: "html" | "css") {
  const startRegex =
    heading === "html"
      ? /(?:^|\n)\s*(?:#{1,4}\s*)?HTML\s*:?\s*\n/i
      : /(?:^|\n)\s*(?:#{1,4}\s*)?CSS\s*:?\s*\n/i;

  const startMatch = startRegex.exec(value);

  if (!startMatch || startMatch.index < 0) return "";

  const startIndex = startMatch.index + startMatch[0].length;
  const rest = value.slice(startIndex);

  const endRegex =
    heading === "html"
      ? /(?:^|\n)\s*(?:#{1,4}\s*)?(?:CSS|```css|Control visual|Control|Notas|Observaciones)\s*:?\s*\n/i
      : /(?:^|\n)\s*(?:#{1,4}\s*)?(?:Control visual|Control|Notas|Observaciones)\s*:?\s*\n/i;

  const endMatch = endRegex.exec(rest);
  const section = endMatch ? rest.slice(0, endMatch.index) : rest;

  return stripMarkdownCodeFence(section);
}

function extractLooseHtml(value: string) {
  const fencedHtml = extractFencedBlock(value, "html");

  if (fencedHtml) return fencedHtml;

  const headingHtml = extractHeadingSection(value, "html");

  if (headingHtml) return headingHtml;

  const htmlStart = value.search(
    /<(?:!doctype|html|body|main|section|div|header|article|svg|img)\b/i
  );

  if (htmlStart < 0) return "";

  const afterStart = value.slice(htmlStart);
  const cssHeading =
    /(?:^|\n)\s*(?:#{1,4}\s*)?(?:CSS|```css)\s*:?\s*\n/i.exec(afterStart);

  const htmlCandidate = cssHeading
    ? afterStart.slice(0, cssHeading.index)
    : afterStart;

  return stripMarkdownCodeFence(
    htmlCandidate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  );
}

function extractLooseCss(value: string) {
  const fencedCss = extractFencedBlock(value, "css");

  if (fencedCss) return fencedCss;

  const headingCss = extractHeadingSection(value, "css");

  if (headingCss) return headingCss;

  const styleMatch = value.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

  if (styleMatch?.[1]?.trim()) {
    return styleMatch[1].trim();
  }

  const cssCandidateStart = value.search(
    /(?:^|\n)\s*(?:body|html|\*|\.|#|@media|@font-face|:root)[\s\S]*?\{/i
  );

  if (cssCandidateStart < 0) return "";

  const candidate = value.slice(cssCandidateStart);
  const controlStart = candidate.search(
    /(?:^|\n)\s*(?:#{1,4}\s*)?(?:Control visual|Control|Notas|Observaciones)\s*:?\s*\n/i
  );

  return stripMarkdownCodeFence(
    controlStart >= 0 ? candidate.slice(0, controlStart) : candidate
  );
}

function extractControlVisual(value: string) {
  const controlMatch =
    /(?:^|\n)\s*(?:#{1,4}\s*)?Control visual\s*:?\s*\n([\s\S]*)$/i.exec(
      value
    );

  return controlMatch?.[1]?.trim() || "";
}

function buildEmergencyCssFromHtml(html: string) {
  if (!html.trim()) return "";

  return `
:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100vh;
}

body {
  display: grid;
  place-items: center;
  background: #050816;
  color: #ffffff;
  font-family: system-ui, sans-serif;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

svg {
  display: block;
}
`.trim();
}

function normalizeVisualMarkdown(outputText: string) {
  const html = extractLooseHtml(outputText);
  const extractedCss = extractLooseCss(outputText);
  const css = extractedCss || buildEmergencyCssFromHtml(html);
  const controlVisual = extractControlVisual(outputText);

  if (!html && !css) return outputText.trim();

  const normalizedParts: string[] = [];

  if (html) {
    normalizedParts.push("## HTML", "", "```html", html, "```");
  }

  if (css) {
    normalizedParts.push("", "## CSS", "", "```css", css, "```");
  }

  normalizedParts.push(
    "",
    "## Control visual",
    "",
    controlVisual ||
      "- Textos visibles preservados: según lectura del modelo.",
    "- Aproximaciones: salida normalizada automáticamente para cerrar bloques markdown.",
    "- No detectable: revisar contra imagen fuente.",
    "- Escala aplicada: según CSS generado.",
    "- Viewport usado: según CSS generado."
  );

  return normalizedParts.join("\n").trim();
}

function validateVisualReplicationOutput(outputText: string) {
  const normalizedOutput = outputText.toLowerCase();
  const issues: string[] = [];

  if (!/```html[\s\S]*?```/i.test(outputText)) {
    issues.push("falta un bloque markdown html completo");
  }

  if (!/```css[\s\S]*?```/i.test(outputText)) {
    issues.push("falta un bloque markdown css completo");
  }

  if (/<link\b[^>]*stylesheet/i.test(outputText)) {
    issues.push("usa un stylesheet externo en vez de CSS inline/en bloque");
  }

  if (/<script\b[^>]*src=/i.test(outputText)) {
    issues.push("usa scripts externos");
  }

  if (
    normalizedOutput.includes("no pude") ||
    normalizedOutput.includes("no puedo") ||
    normalizedOutput.includes("no es posible")
  ) {
    issues.push("la respuesta evita construir la réplica visual");
  }

  if (
    normalizedOutput.includes("resumen de lo importante") ||
    normalizedOutput.includes("hallazgos relevantes")
  ) {
    issues.push("el modelo respondió análisis de imagen en vez de HTML/CSS");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLocalMockArtifact(lastUserMessage: string, reason: string) {
  const wantsCard = /\b(tarjeta|card|business card)\b/i.test(lastUserMessage);
  const wantsCv = /\b(cv|curriculum|curriculo|curriculum vitae)\b/i.test(
    lastUserMessage
  );
  const wantsReport =
    /\b(cajr\d+|reporte|report|sql|query|queries|tabla|template|plantilla|layout)\b/i.test(
      lastUserMessage
    );

  if (wantsReport) {
    return `## HTML

\`\`\`html
<main class="report-stage">
  <section class="report-page" aria-label="Reporte mock">
    <header class="report-header">
      <div>
        <p class="eyebrow">Reporte CAJR30401</p>
        <h1>Control de operaciones</h1>
        <p class="subtitle">Preview con datos mockeados desde plantilla Markdown/SQL.</p>
      </div>
      <div class="stamp">MarTwin<br />Mock Preview</div>
    </header>

    <section class="filters">
      <div><span>Fecha desde</span><strong>01/06/2026</strong></div>
      <div><span>Fecha hasta</span><strong>07/06/2026</strong></div>
      <div><span>Sucursal</span><strong>Todas</strong></div>
      <div><span>Estado</span><strong>Procesado</strong></div>
    </section>

    <section class="summary">
      <article><span>Operaciones</span><strong>128</strong></article>
      <article><span>Total bruto</span><strong>$ 18.420.300</strong></article>
      <article><span>Comisiones</span><strong>$ 642.800</strong></article>
    </section>

    <table>
      <thead>
        <tr>
          <th>Operacion</th>
          <th>Cliente</th>
          <th>Producto</th>
          <th>Estado</th>
          <th class="num">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>CAJ-000341</td><td>Acme S.A.</td><td>Pago proveedor</td><td><span class="ok">Procesado</span></td><td class="num">$ 245.900</td></tr>
        <tr><td>CAJ-000342</td><td>Norte SRL</td><td>Cobranza</td><td><span class="warn">Pendiente</span></td><td class="num">$ 98.120</td></tr>
        <tr><td>CAJ-000343</td><td>Delta Group</td><td>Transferencia</td><td><span class="ok">Procesado</span></td><td class="num">$ 512.780</td></tr>
        <tr><td>CAJ-000344</td><td>Sur Logistica</td><td>Conciliacion</td><td><span class="ok">Procesado</span></td><td class="num">$ 176.400</td></tr>
      </tbody>
    </table>
  </section>
</main>
\`\`\`

## CSS

\`\`\`css
.report-stage {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: #0f172a;
  font-family: Arial, sans-serif;
}

.report-page {
  width: 1120px;
  min-height: 760px;
  padding: 42px;
  background: #f8fafc;
  color: #0f172a;
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.35);
}

.report-header {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 24px;
  border-bottom: 3px solid #e50051;
}

.eyebrow {
  margin: 0 0 10px;
  color: #e50051;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 38px;
}

.subtitle {
  margin: 10px 0 0;
  color: #475569;
}

.stamp {
  align-self: start;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
  text-transform: uppercase;
}

.filters,
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 24px;
}

.filters div,
.summary article {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.filters span,
.summary span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
}

.summary {
  grid-template-columns: repeat(3, 1fr);
}

.summary strong {
  font-size: 26px;
}

table {
  width: 100%;
  margin-top: 28px;
  border-collapse: collapse;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

th,
td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  text-align: left;
}

th {
  color: #475569;
  background: #eef2f7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.num {
  text-align: right;
}

.ok,
.warn {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
}

.ok {
  background: #dcfce7;
  color: #166534;
}

.warn {
  background: #fef3c7;
  color: #92400e;
}
\`\`\`

## Control visual

- Preview mock local generado porque el proveedor no devolvió HTML/CSS usable.
- Motivo: ${escapeHtml(reason)}
- Datos usados: operaciones, filtros y totales ficticios.
- Formato: reporte administrativo horizontal basado en una plantilla Markdown/SQL.`;
  }

  if (wantsCard) {
    return `## HTML

\`\`\`html
<main class="mock-card-stage">
  <section class="business-card" aria-label="Tarjeta personal mock">
    <div class="brand-mark">MT</div>
    <div class="card-copy">
      <p class="eyebrow">Producto digital</p>
      <h1>Martina Torres</h1>
      <p class="role">Full Stack Developer</p>
      <dl>
        <div><dt>Email</dt><dd>martina@example.com</dd></div>
        <div><dt>Web</dt><dd>martwin.dev</dd></div>
        <div><dt>Tel</dt><dd>+54 11 5555 0123</dd></div>
      </dl>
    </div>
  </section>
</main>
\`\`\`

## CSS

\`\`\`css
.mock-card-stage {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px;
  background: #111827;
  font-family: Inter, Arial, sans-serif;
}

.business-card {
  width: 640px;
  aspect-ratio: 1.75;
  display: grid;
  grid-template-columns: 180px 1fr;
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff 0%, #eef2ff 100%);
  color: #111827;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.34);
}

.brand-mark {
  display: grid;
  place-items: center;
  background: #e50051;
  color: #ffffff;
  font-size: 52px;
  font-weight: 800;
}

.card-copy {
  padding: 42px 48px;
}

.eyebrow {
  margin: 0 0 16px;
  color: #e50051;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 42px;
}

.role {
  margin: 8px 0 30px;
  color: #4b5563;
  font-size: 18px;
}

dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

dl div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 18px;
}

dt {
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
}

dd {
  margin: 0;
  font-size: 14px;
}
\`\`\`

## Control visual

- Preview mock local generado porque el proveedor no devolvió HTML/CSS usable.
- Motivo: ${escapeHtml(reason)}
- Datos usados: placeholders editables.
- Formato: tarjeta personal horizontal.`;
  }

  const documentTitle = wantsCv ? "Curriculum Vitae" : "Documento visual";
  const personName = wantsCv ? "Martina Torres" : "MarTwin Preview";
  const role = wantsCv ? "Full Stack Developer" : "Artefacto mockeado";

  return `## HTML

\`\`\`html
<main class="page-shell">
  <article class="document-page" aria-label="${documentTitle} mock">
    <header class="hero">
      <div>
        <p class="kicker">${documentTitle}</p>
        <h1>${personName}</h1>
        <p class="subtitle">${role}</p>
      </div>
      <aside class="contact">
        <span>martina@example.com</span>
        <span>Buenos Aires, AR</span>
        <span>linkedin.com/in/martina</span>
      </aside>
    </header>

    <section>
      <h2>Perfil</h2>
      <p>Profesional orientada a crear productos digitales claros, rápidos y mantenibles. Este contenido está mockeado para permitir preview inmediato sin consumir modelo pago.</p>
    </section>

    <section class="grid">
      <div>
        <h2>Experiencia</h2>
        <ul>
          <li><strong>MarTwin</strong><span>Frontend, automatización y documentación técnica.</span></li>
          <li><strong>MarTwin Labs</strong><span>Diseño de interfaces, APIs y flujos internos.</span></li>
        </ul>
      </div>
      <div>
        <h2>Skills</h2>
        <p>React, Next.js, Node.js, TypeScript, UX, QA, documentación y automatización.</p>
      </div>
    </section>
  </article>
</main>
\`\`\`

## CSS

\`\`\`css
.page-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: #111827;
  font-family: Inter, Arial, sans-serif;
}

.document-page {
  width: 794px;
  min-height: 1123px;
  padding: 64px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.32);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 34px;
  border-bottom: 3px solid #e50051;
}

.kicker {
  margin: 0 0 12px;
  color: #e50051;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 54px;
  line-height: 1;
}

.subtitle {
  margin: 14px 0 0;
  color: #4b5563;
  font-size: 20px;
}

.contact {
  display: grid;
  gap: 8px;
  align-content: start;
  color: #4b5563;
  font-size: 13px;
  text-align: right;
}

section {
  margin-top: 36px;
}

h2 {
  margin: 0 0 14px;
  color: #e50051;
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

p {
  margin: 0;
  color: #374151;
  font-size: 16px;
  line-height: 1.7;
}

.grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 42px;
}

ul {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  gap: 4px;
}

li span {
  color: #4b5563;
  line-height: 1.55;
}
\`\`\`

## Control visual

- Preview mock local generado porque el proveedor no devolvió HTML/CSS usable.
- Motivo: ${escapeHtml(reason)}
- Datos usados: placeholders editables.
- Formato: hoja A4 visual para exportar como PDF, imagen o Word.`;
}

function shouldUseLocalWorkspacePreview(
  lastUserMessage: string,
  contextFromDocs: string
) {
  return (
    /\b(preview|vista previa|render|renderiza|renderizar|mock|mockeando)\b/i.test(
      lastUserMessage
    ) &&
    /<WORKSPACE_OBJECT_ENTRY/i.test(contextFromDocs) &&
    /(queries\s*:|layout\s*:|export\s+default|#\[[A-Z0-9_]+\]#)/i.test(
      contextFromDocs
    )
  );
}

function extractReportColumns(contextFromDocs: string) {
  const columns: string[] = [];
  const aliasRegex = /AS\s+"([^"|"]+)(?:\|[^"]*)?"/gi;
  let match: RegExpExecArray | null;

  while ((match = aliasRegex.exec(contextFromDocs)) && columns.length < 18) {
    const column = match[1].trim();

    if (column && !columns.includes(column)) {
      columns.push(column);
    }
  }

  return columns.length
    ? columns
    : ["Tipo", "Ramo", "Siniestro", "Beneficiario", "Importe", "Egreso"];
}

function getMockReportCell(column: string, rowIndex: number) {
  const normalized = column.toLowerCase();
  const rowNumber = rowIndex + 1;

  if (normalized.includes("tipo")) {
    return ["PROVEEDOR", "SINIESTRO", "REINTEGRO"][rowIndex % 3];
  }

  if (normalized.includes("ramo")) return String([18, 3, 12][rowIndex % 3]);
  if (normalized.includes("siniestro")) return String(840120 + rowIndex * 17);
  if (normalized.includes("beneficiario")) {
    return ["Zurich Servicios", "Taller Norte", "Maria Gomez", "Proveedor Delta"][
      rowIndex % 4
    ];
  }
  if (normalized.includes("importe")) {
    return `$ ${(124500 + rowIndex * 38520).toLocaleString("es-AR")}`;
  }
  if (normalized.includes("cheque")) return String(93000 + rowIndex);
  if (normalized.includes("egreso")) return String(304500 + rowIndex);
  if (normalized.includes("fecha")) return `0${rowNumber}/06/2026`;
  if (normalized.includes("estado")) return rowIndex % 2 === 0 ? "Emitido" : "Pendiente";
  if (normalized.includes("sucursal")) return String([1, 12, 25][rowIndex % 3]);
  if (normalized.includes("cbu")) return `00000031000${rowIndex}987654`;
  if (normalized.includes("poliza")) return String(7001200 + rowIndex);
  if (normalized.includes("factura")) return `A-${String(1280 + rowIndex)}`;
  if (normalized.includes("dni") || normalized.includes("cuit")) {
    return `30-71234${rowIndex}8-${rowIndex}`;
  }

  return `Dato ${rowNumber}`;
}

function buildLocalWorkspaceReportPreview(
  contextFromDocs: string,
  lastUserMessage: string
) {
  const nameMatch =
    /name\s*:\s*"([^"]+)"/i.exec(contextFromDocs) ||
    /<title>([^<]+)<\/title>/i.exec(contextFromDocs) ||
    /name="([^"]+)"/i.exec(contextFromDocs);
  const titleMatch =
    /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i.exec(contextFromDocs) ||
    /description\s*:\s*"([^"]+)"/i.exec(contextFromDocs);
  const reportName = nameMatch?.[1]?.trim() || "Reporte";
  const reportTitle = titleMatch?.[1]?.trim() || `${reportName} - Preview`;
  const columns = extractReportColumns(contextFromDocs);
  const rows = Array.from({ length: 6 }, (_, rowIndex) =>
    columns.map((column) => getMockReportCell(column, rowIndex))
  );
  const headerCells = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) => {
            const numeric = /importe|ramo|siniestro|cheque|egreso|poliza/i.test(
              columns[index]
            );

            return `<td class="${numeric ? "num" : ""}">${escapeHtml(cell)}</td>`;
          })
          .join("")}</tr>`
    )
    .join("\n");

  return `## HTML

\`\`\`html
<main class="report-preview">
  <section class="report-sheet" aria-label="${escapeHtml(reportName)} mock">
    <header class="report-header">
      <div class="brand">Zurich Santander</div>
      <div>
        <p class="eyebrow">${escapeHtml(reportName)}</p>
        <h1>${escapeHtml(reportTitle)}</h1>
        <p class="meta">NU_SECUENCIA: 30450 · Datos mockeados · ${new Date()
          .toISOString()
          .slice(0, 10)}</p>
      </div>
    </header>

    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  </section>
</main>
\`\`\`

## CSS

\`\`\`css
.report-preview {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
  background: #101827;
  font-family: Arial, sans-serif;
}

.report-sheet {
  width: 1180px;
  min-height: 760px;
  padding: 34px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 28px;
  margin-bottom: 28px;
  padding-bottom: 18px;
  border-bottom: 3px solid #1e3a8a;
}

.brand {
  min-width: 180px;
  padding: 13px 16px;
  border-left: 6px solid #e50051;
  color: #1e3a8a;
  font-size: 15px;
  font-weight: 700;
}

.eyebrow {
  margin: 0 0 8px;
  color: #e50051;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: right;
}

h1 {
  margin: 0;
  font-size: 24px;
  text-align: right;
}

.meta {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #dbe3ef;
}

th,
td {
  padding: 9px 8px;
  border: 1px solid #dbe3ef;
  font-size: 11px;
  vertical-align: top;
  word-break: break-word;
}

th {
  background: #e8eef7;
  color: #1e3a8a;
  font-size: 10px;
  text-transform: uppercase;
}

tbody tr:nth-child(even) {
  background: #f8fafc;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
\`\`\`

## Control visual

- Preview local generado desde el contenido del workspace, sin usar modelo externo.
- No se renderiza el codigo fuente: se renderiza la salida esperada del template/script.
- Columnas detectadas del SQL: ${columns.map((column) => `\`${column}\``).join(", ")}.
- Datos mockeados para validar layout, tabla y exportaciones CSV/XLS.
- Pedido original: ${escapeHtml(lastUserMessage)}.`;
}

function buildOpenRouterBodyPayload({
  model,
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
}: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
}) {
  const hasPdf = uploadedFiles.some(isPdfFile);

  return {
    model,
    stream: false,
    temperature: 0,
    max_tokens: maxOutputTokens,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: buildOpenRouterUserContent(userPrompt, uploadedFiles),
      },
    ],
    ...(hasPdf
      ? {
          plugins: [
            {
              id: "file-parser",
              pdf: {
                engine: "cloudflare-ai",
              },
            },
          ],
        }
      : {}),
  };
}

function buildGeminiBodyPayload({
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
}: {
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
}) {
  return {
    systemInstruction: {
      parts: [
        {
          text: systemPrompt,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: buildGeminiUserParts(userPrompt, uploadedFiles),
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens,
    },
  };
}

async function requestOpenRouterCompletion({
  model,
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
}: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
}) {
  const bodyPayload = buildOpenRouterBodyPayload({
    model,
    systemPrompt,
    userPrompt,
    uploadedFiles,
    maxOutputTokens,
  });

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": openRouterSiteUrl,
      "X-Title": openRouterAppName,
      "X-OpenRouter-Title": openRouterAppName,
    },
    body: JSON.stringify(bodyPayload),
  });
}

async function requestGeminiCompletion({
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
}: {
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
}) {
  const bodyPayload = buildGeminiBodyPayload({
    systemPrompt,
    userPrompt,
    uploadedFiles,
    maxOutputTokens,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    geminiModel
  )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });
}

function buildPlainTextStream(text: string) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function readTextStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return text;
}

async function createOpenAITextStream({
  messages,
  uploadedFiles,
  systemPrompt,
  maxOutputTokens,
}: {
  messages: MarTwinMessage[];
  uploadedFiles: UploadedFile[];
  systemPrompt: string;
  maxOutputTokens: number;
}) {
  if (!openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const input = buildResponseInput(messages, uploadedFiles, systemPrompt);

  const response = await openai.responses.create({
    model: chatModel,
    input,
    temperature: 0,
    max_output_tokens: maxOutputTokens,
  });

  const text = getOpenAIResponseText(response).trim();

  if (!text) {
    throw new Error("OPENAI_EMPTY_RESPONSE");
  }

  return buildPlainTextStream(text);
}

async function createGeminiTextStream({
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
}: {
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
}) {
  if (!geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const hasPdf = uploadedFiles.some(isPdfFile);
  const hasImage = uploadedFiles.some(isImageFile);

  console.log("[Gemini_Request_Debug]", {
    provider: "gemini",
    model: geminiModel,
    hasKey: Boolean(geminiApiKey),
    keyPrefix: geminiApiKey.slice(0, 6),
    uploadedFiles: uploadedFiles.length,
    hasImage,
    hasPdf,
    maxOutputTokens,
  });

  const response = await requestGeminiCompletion({
    systemPrompt,
    userPrompt,
    uploadedFiles,
    maxOutputTokens,
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    let errorMessage = responseText;

    try {
      const payload = JSON.parse(responseText) as GeminiResponsePayload;
      errorMessage = payload.error?.message || responseText;
    } catch {
      // dejamos responseText tal cual
    }

    const error = new Error(`GEMINI_HTTP_${response.status}: ${errorMessage}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  let payload: GeminiResponsePayload;

  try {
    payload = JSON.parse(responseText) as GeminiResponsePayload;
  } catch {
    payload = {};
  }

  const outputText = extractGeminiText(payload).trim();

  console.log("[Gemini_Response_Debug]", {
    model: geminiModel,
    status: response.status,
    hasText: Boolean(outputText),
    responseLength: responseText.length,
    responsePreview: responseText.slice(0, 500),
  });

  if (!outputText) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return buildPlainTextStream(outputText);
}

async function createOpenRouterTextStream({
  systemPrompt,
  userPrompt,
  uploadedFiles,
  maxOutputTokens,
  models,
  modeLabel,
}: {
  systemPrompt: string;
  userPrompt: string;
  uploadedFiles: UploadedFile[];
  maxOutputTokens: number;
  models: string[];
  modeLabel: "text" | "vision";
}) {
  if (!openRouterApiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const attemptedErrors: string[] = [];
  const emptyResponses: string[] = [];
  const truncatedResponses: string[] = [];
  const hasPdf = uploadedFiles.some(isPdfFile);
  const hasImage = uploadedFiles.some(isImageFile);
  const modelCandidates = models.length > 0 ? models : ["openrouter/free"];

  console.log("[OpenRouter_Request_Debug]", {
    provider: "openrouter",
    mode: modeLabel,
    transport: "non-stream",
    models: modelCandidates,
    hasKey: Boolean(openRouterApiKey),
    keyPrefix: openRouterApiKey.slice(0, 9),
    keyLength: openRouterApiKey.length,
    uploadedFiles: uploadedFiles.length,
    hasImage,
    hasPdf,
    maxOutputTokens,
  });

  for (const model of modelCandidates) {
    const candidateResponse = await requestOpenRouterCompletion({
      model,
      systemPrompt,
      userPrompt,
      uploadedFiles,
      maxOutputTokens,
    });

    const responseText = await candidateResponse.text().catch(() => "");

    if (!candidateResponse.ok) {
      const readableError = getOpenRouterErrorMessage(
        candidateResponse.status,
        responseText
      );

      attemptedErrors.push(`${model}: ${readableError}`);

      console.warn("[OpenRouter_Model_Failed]", {
        mode: modeLabel,
        model,
        status: candidateResponse.status,
        error: readableError,
      });

      if (!shouldTryNextOpenRouterModel(candidateResponse.status, responseText)) {
        throw new Error(readableError);
      }

      continue;
    }

    let payload: OpenRouterResponsePayload;

    try {
      payload = JSON.parse(responseText) as OpenRouterResponsePayload;
    } catch {
      payload = {};
    }

    const outputText = extractOpenRouterText(payload).trim();
    const finishReason = getOpenRouterFinishReason(payload);

    console.log("[OpenRouter_Model_Response]", {
      mode: modeLabel,
      model,
      status: candidateResponse.status,
      hasText: Boolean(outputText),
      finishReason,
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 500),
    });

    if (outputText) {
      if (isOutputProbablyTruncated(outputText, finishReason)) {
        truncatedResponses.push(
          [
            `Modelo: ${model}`,
            `Status: ${candidateResponse.status}`,
            `Finish reason: ${finishReason || "UNKNOWN"}`,
            `Preview final: ${outputText.slice(-500) || "EMPTY_TEXT"}`,
          ].join("\n")
        );

        console.warn("[OpenRouter_Model_Truncated]", {
          mode: modeLabel,
          model,
          status: candidateResponse.status,
          finishReason,
        });

        continue;
      }

      console.log("[OpenRouter_Model_Selected]", {
        mode: modeLabel,
        model,
        status: candidateResponse.status,
      });

      return buildPlainTextStream(outputText);
    }

    emptyResponses.push(
      [
        `Modelo: ${model}`,
        `Status: ${candidateResponse.status}`,
        `Preview: ${responseText.slice(0, 800) || "EMPTY_BODY"}`,
      ].join("\n")
    );
  }

  return buildPlainTextStream(
    [
      "OpenRouter respondió, pero no devolvió texto utilizable.",
      "",
      `Modo usado: ${modeLabel}`,
      "",
      "Modelos probados:",
      ...modelCandidates.map((model) => `- ${model}`),
      "",
      attemptedErrors.length > 0 ? "Errores detectados:" : "",
      ...attemptedErrors.map((error) => `- ${error}`),
      "",
      emptyResponses.length > 0 ? "Respuestas vacías recibidas:" : "",
      ...emptyResponses.map((item) => `---\n${item}`),
      "",
      truncatedResponses.length > 0 ? "Respuestas cortadas recibidas:" : "",
      ...truncatedResponses.map((item) => `---\n${item}`),
      "",
      hasImage
        ? "Diagnóstico: los modelos vision gratuitos de OpenRouter no devolvieron contenido útil en este intento."
        : "Diagnóstico: OpenRouter aceptó la request, pero el modelo gratuito no generó contenido.",
      "",
      "Prueba recomendada:",
      "1. Verificá que OPENROUTER_VISION_MODEL_LIST tenga slugs válidos.",
      "2. Si todos fallan por 429/404, esperá o usá BYOK/modelo pago.",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function createProviderTextStream({
  messages,
  uploadedFiles,
  systemPrompt,
  maxOutputTokens,
  isVisualRequest,
}: {
  messages: MarTwinMessage[];
  uploadedFiles: UploadedFile[];
  systemPrompt: string;
  maxOutputTokens: number;
  isVisualRequest: boolean;
}) {
  const userPrompt = buildUserPrompt(messages);

  if (aiProvider === "openrouter") {
    return createOpenRouterTextStream({
      systemPrompt,
      userPrompt,
      uploadedFiles,
      maxOutputTokens,
      models: isVisualRequest ? openRouterVisionModelList : openRouterModelList,
      modeLabel: isVisualRequest ? "vision" : "text",
    });
  }

  if (aiProvider === "gemini") {
    return createGeminiTextStream({
      systemPrompt,
      userPrompt,
      uploadedFiles,
      maxOutputTokens,
    });
  }

  if (aiProvider !== "openai" && aiProvider !== "auto") {
    return buildPlainTextStream(
      [
        `Proveedor IA no soportado: ${aiProvider}`,
        "",
        "Usá uno de estos valores en .env.local:",
        "- AI_PROVIDER=openai",
        "- AI_PROVIDER=gemini",
        "- AI_PROVIDER=openrouter",
        "- AI_PROVIDER=auto",
      ].join("\n")
    );
  }

  try {
    console.log("[OpenAI_Request_Debug]", {
      provider: aiProvider,
      model: chatModel,
      hasKey: Boolean(openaiApiKey),
      keyPrefix: openaiApiKey.slice(0, 7),
      uploadedFiles: uploadedFiles.length,
      maxOutputTokens,
      geminiFallbackEnabled: enableGeminiFallback,
      openRouterFallbackEnabled: enableOpenRouterFallback,
      openRouterVisualFallbackEnabled: enableOpenRouterVisualFallback,
      isVisualRequest,
    });

    return await createOpenAITextStream({
      messages,
      uploadedFiles,
      systemPrompt,
      maxOutputTokens,
    });
  } catch (openAiError) {
    console.error("[OpenAI_Primary_Failed]", openAiError);

    if (!isOpenAiFallbackError(openAiError)) {
      throw openAiError;
    }

    let lastFallbackError: unknown = openAiError;

    if (enableGeminiFallback && geminiApiKey) {
      try {
        console.warn("[Provider_Fallback_To_Gemini]", {
          reason:
            openAiError instanceof Error ? openAiError.message : "unknown",
          model: geminiModel,
        });

        return await createGeminiTextStream({
          systemPrompt,
          userPrompt,
          uploadedFiles,
          maxOutputTokens,
        });
      } catch (geminiError) {
        lastFallbackError = geminiError;

        console.error("[Gemini_Secondary_Failed]", geminiError);

        if (!isGeminiFallbackError(geminiError)) {
          throw geminiError;
        }
      }
    }

    if (
      isVisualRequest &&
      enableOpenRouterFallback &&
      enableOpenRouterVisualFallback &&
      openRouterApiKey
    ) {
      console.warn("[Provider_Fallback_To_OpenRouter_Vision]", {
        reason:
          lastFallbackError instanceof Error
            ? lastFallbackError.message
            : "OpenAI/Gemini unavailable",
        models: openRouterVisionModelList,
      });

      return createOpenRouterTextStream({
        systemPrompt,
        userPrompt,
        uploadedFiles,
        maxOutputTokens,
        models: openRouterVisionModelList,
        modeLabel: "vision",
      });
    }

    if (isVisualRequest) {
      throw new Error(
        [
          "VISUAL_PROVIDER_CHAIN_FAILED",
          "OpenAI falló y Gemini no pudo completar la réplica visual.",
          enableOpenRouterVisualFallback
            ? "OpenRouter Vision no está disponible o no tiene API key configurada."
            : "OpenRouter Vision está desactivado para imagen.",
          getErrorMessage(lastFallbackError),
        ]
          .filter(Boolean)
          .join(": ")
      );
    }

    if (enableOpenRouterFallback && openRouterApiKey) {
      console.warn("[Provider_Fallback_To_OpenRouter_Text]", {
        reason:
          lastFallbackError instanceof Error
            ? lastFallbackError.message
            : "OpenAI/Gemini unavailable",
        models: openRouterModelList,
      });

      return createOpenRouterTextStream({
        systemPrompt,
        userPrompt,
        uploadedFiles,
        maxOutputTokens,
        models: openRouterModelList,
        modeLabel: "text",
      });
    }

    throw openAiError;
  }
}

function buildVisualInstructions() {
  return `REQUESTED_FILE_TASK: VISUAL_REPLICATION.
- Generate one complete HTML fenced block and one complete CSS fenced block.
- The final answer must contain exactly:
  ## HTML
  \`\`\`html
  ...
  \`\`\`
  ## CSS
  \`\`\`css
  ...
  \`\`\`
  ## Control visual
- Do not return only analysis.
- Do not return only description.
- Do not return HTML without CSS.
- Do not return CSS without HTML.
- Never use <link rel="stylesheet" href="style.css">.
- Never use <link rel="stylesheet">.
- Never use external CSS files.
- Never use external JS files.
- CSS must be returned inside the fenced css block.
- HTML must be returned inside the fenced html block.
- Do not invent filenames or external images.
- Reproduce what is visible.

TEXT_TO_ARTIFACT_MODE:
- If the user asks for a CV, personal card, PDF, Word document, image, PNG, SVG, JPG, JPEG, GIF, HTML/CSS or preview from text/context, create a finished visual artifact as HTML and CSS.
- Treat the requested format as the intended export target, but still return complete HTML and CSS fenced blocks so the UI can render and export it.
- Design the actual artifact, not instructions about how to design it.
- Use semantic document structure for CVs, letters and Word/PDF-like outputs.
- Use fixed or print-friendly dimensions when a physical/exported document is requested:
  - CV, report, letter, Word or PDF: A4-like layout.
  - Personal card: business-card-like proportions.
  - Social/banner/flyer/poster/image: choose a suitable canvas and state it in Control visual.
- If the user provides text and context, preserve the user-provided facts and do not invent missing personal data.
- If required data is missing, leave tasteful placeholders only when needed and mark them in Control visual.
- If the workspace context contains STYLE.md plus a report/template Markdown file with SQL and HTML layout, render a preview using mocked rows, filters, totals and labels.
- Do not answer with "I see the workspace contains..." when the user asks for a preview, mock, mockup, render or visual output.
- For report templates, keep the template intent and create a realistic administrative report screen/page with mocked data.

EXACT_ASSET_MODE:
- If the attached image is a closed graphic piece, logo, splash screen, banner, brand plate, card, poster, screenshot-like design, or composition where exact visual fidelity matters, use the attached image as the main visual asset.
- In exact asset mode, place the image with <img src="EXACT_UPLOADED_FILENAME" /> using the exact filename listed in UPLOADED_ASSETS.
- The preview renderer will replace that filename with the real data URL.
- Preserve original aspect ratio using object-fit: contain.
- Build the surrounding layout, viewport, centering, background, frame and spacing with CSS.
- Do not redraw the logo/icon/text with SVG/CSS when exact asset mode applies.
- Only redraw with SVG/CSS if the user explicitly asks: "sin usar la imagen", "reconstrucción vectorial", "redibujalo en CSS/SVG", or similar.
- This mode has priority over abstract reconstruction when the goal is visual precision.

STRICT_VISUAL_REPLICATION:
- Treat the source as a measured composition, not inspiration.
- Internally extract: canvas size, background, grid/texture, icon geometry, colors, gradients, typography, text, spacing and alignment.
- Prefer fixed dimensions and explicit positioning when it improves fidelity.
- Preserve visual hierarchy, aspect ratio, margins, gaps, colors, gradients, shadows, borders, text size and letter spacing.
- For logo/splash/brand screenshots, use a desktop or wide canvas when the source is wide.
- Do not force a mobile canvas for logo, splash, brand plate, desktop screenshot or wide image.

STRICT_TEXT_LOCK:
- Copy visible text exactly.
- Do not interpret, rewrite, translate, correct, split, merge or improve visible text.
- Preserve accents, uppercase/lowercase, spaces and word joins.
- Do not infer a business category from the image.
- Do not add words that are not visible.
- Do not remove visible words.
- If text is uncertain, use the closest visible reading and mention uncertainty in Control visual.

STRICT_LOGO_LOCK:
- Do not replace the source logo/isotipo with a conceptual icon.
- Do not invent suitcases, boxes, bags, shields, locks, robots, monitors, generic app icons or decorative unrelated symbols.
- If using exact asset mode, do not redraw the source graphic.
- If exact asset mode is not used and the source mark is abstract geometry, output abstract geometry.
- Never replace an abstract mark with a literal object.
- Preserve palette and gradient families.

TYPOGRAPHY_LOCK:
- Typography must be replicated, not replaced with a default lazy font.
- Preserve perceived font category, weight, width, cap height, letter spacing, word spacing, alignment and line breaks.
- If exact typography cannot be matched, approximate with CSS and mention it in Control visual.

COMPACTNESS:
- Keep code complete and compact.
- Avoid giant SVG paths.
- Prefer exact asset mode for logos, splash screens, banners and closed visual pieces.
- Never stop inside an HTML or CSS block.`;
}

function buildAnalysisInstructions() {
  return `REQUESTED_FILE_TASK: CONTENT_ANALYSIS.
- Analyze the attached file content only.
- For images, describe and analyze visible content, text, data, UI states, risks, requirements or relevant findings.
- For PDFs, summarize, extract key points, requirements, rules, data, risks and possible next actions.
- Do not generate HTML/CSS or preview code unless the current request explicitly asks for it.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages: MarTwinMessage[] = Array.isArray(body.messages)
      ? body.messages
      : [];

    const uploadedFiles: UploadedFile[] = Array.isArray(body.uploadedFiles)
      ? body.uploadedFiles
      : [];

    const requestedFileTaskMode: FileTaskMode =
      body.fileTaskMode === "visual" ? "visual" : "analysis";

    const imageFiles = uploadedFiles.filter(isImageFile);
    const pdfFiles = uploadedFiles.filter(isPdfFile);

    const lastMessage = messages[messages.length - 1];
    const lastUserMessage = getMessageText(lastMessage).toLowerCase();

    const hasImage = imageFiles.length > 0;
    const hasPdf = pdfFiles.length > 0;
    const hasFile = uploadedFiles.length > 0;
    const fastLocalReply = !hasFile ? getFastLocalReply(lastUserMessage) : "";

    if (fastLocalReply) {
      return new Response(buildPlainTextStream(fastLocalReply), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const isDocsSquadRequest = isDocsSquadTemplateRequest(lastUserMessage);
    const isZurichMigrationRequest =
      isZurichMigrationReportRequest(lastUserMessage);
    const isDetailedZurichMigrationRequest =
      isZurichMigrationRequest && isDetailedReportRequest(lastUserMessage);
    const shouldGenerateArtifactFromText =
      isExplicitArtifactGenerationRequest(lastUserMessage);

    const shouldGenerateVisualOutput =
      (requestedFileTaskMode === "visual" && !isDocsSquadRequest) ||
      shouldGenerateArtifactFromText;

    const shouldLoadLocalContext =
      !shouldSkipLocalContext(lastUserMessage) &&
      (!hasFile || isExplicitWorkspaceContextRequest(lastUserMessage)) &&
      (!shouldGenerateVisualOutput ||
        isExplicitWorkspaceContextRequest(lastUserMessage));

    console.log("[MarTwin_File_Debug]", {
      aiProvider,
      geminiFallback: enableGeminiFallback,
      openRouterFallback: enableOpenRouterFallback,
      openRouterVisualFallback: enableOpenRouterVisualFallback,
      uploadedFiles: uploadedFiles.length,
      imageFiles: imageFiles.length,
      pdfFiles: pdfFiles.length,
      requestedFileTaskMode,
      isDocsSquadRequest,
      isZurichMigrationRequest,
      isDetailedZurichMigrationRequest,
      shouldGenerateVisualOutput,
      shouldLoadLocalContext,
      textModels: openRouterModelList,
      visionModels: openRouterVisionModelList,
      names: uploadedFiles.map((file) => file.name),
      types: uploadedFiles.map((file) => file.type),
    });

    let contextFromDocs = "";
    const fileList: string[] = [];

    if (shouldLoadLocalContext) {
      const numericMatch = getTargetNumericFilter(lastUserMessage);
      const targetExtension = getTargetExtension(lastUserMessage);
      const appendWorkspaceFile = (
        relativePath: string,
        sectorId: string,
        maxChars = 45000
      ) => {
        if (contextFromDocs.length > 65000) return;

        const filePath = path.resolve(process.cwd(), relativePath);

        if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
          return;
        }

        const fileName = path.basename(filePath);

        if (fileList.includes(fileName)) return;

        const content = fs.readFileSync(filePath, "utf8").slice(0, maxChars);

        fileList.push(fileName);

        contextFromDocs += `
<WORKSPACE_OBJECT_ENTRY name="${fileName}" sector="${sectorId}">
${content}
</WORKSPACE_OBJECT_ENTRY>\n`;
      };

      if (isZurichMigrationRequest) {
        const inventoryContext = buildZurichReportInventoryContext();

        if (inventoryContext) {
          contextFromDocs += inventoryContext;
        }

        appendWorkspaceFile(
          "documentacion/prompts/migracion_zurich.md",
          "ZURICH_MIGRATION",
          isDetailedZurichMigrationRequest ? 52000 : 28000
        );
        appendWorkspaceFile(
          "documentacion/prompts/prompt_inicial.md",
          "ZURICH_OPERATIONAL_CONTEXT",
          isDetailedZurichMigrationRequest ? 26000 : 12000
        );
      }

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
          if (fileList.includes(file)) continue;

          const filePath = path.join(fullPath, file);

          if (!fs.lstatSync(filePath).isFile()) continue;

          const content = fs.readFileSync(filePath, "utf8");

          fileList.push(file);

          contextFromDocs += `
<WORKSPACE_OBJECT_ENTRY name="${file}" sector="${sector.id}">
${content}
</WORKSPACE_OBJECT_ENTRY>\n`;

          console.log(
            `[MarTwin_Context_Load]: Inyectando ${file} (${content.length} bytes)`
          );
        }
      }
    }

    if (
      shouldGenerateVisualOutput &&
      shouldUseLocalWorkspacePreview(lastUserMessage, contextFromDocs)
    ) {
      const localWorkspacePreview = buildLocalWorkspaceReportPreview(
        contextFromDocs,
        lastUserMessage
      );

      return new Response(buildPlainTextStream(localWorkspacePreview), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const sourceReferencesList =
      uploadedFiles
        .map(
          (file, index) =>
            `- SOURCE_${index + 1}: name="${file.name}", type="${file.type}"`
        )
        .join("\n") || "NONE";

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
TEMPERATURE_LOCK: 0.0.

CORE_INSTRUCTIONS:
- You are MarTwin IT Development Core, a senior technical assistant.
- Help with requirements, architecture, frontend, backend, QA, debugging, documentation, automation and technical planning.
- Use WORKSPACE_OBJECT_ENTRY context only when relevant.
${isZurichMigrationRequest ? "- For Zurich migration reports, never ask for clarification only because multiple report files are present; synthesize the requested report from the available inventory." : `- If multiple workspace files are detected (${fileList.join(", ")}), ask for clarification before processing.`}

${shouldGenerateVisualOutput ? buildVisualInstructions() : buildAnalysisInstructions()}

${isDocsSquadRequest ? `DOCS_SQUAD_TEMPLATE_MODE:
- The user wants a technical documentation report that will be downloaded with the corporate Squad DOCX template.
- Answer with the final report content in clean Markdown.
- Start with one clear H1 title.
- Include concise sections for objective, functional description, technical details, scope, assumptions, risks and next steps when applicable.
- Do not generate HTML, CSS, JSON, code fences or visual preview unless explicitly requested.
- Do not say that you cannot create the DOCX; the UI will create it from your answer.` : ""}

${isZurichMigrationRequest ? `ZURICH_MIGRATION_REPORT_MODE:
- The user is asking for a report about an already performed Zurich report migration.
- Treat "31 reportes" or similar wording as the requested scope/quantity, not as a missing file id.
- Do not block the answer by saying only a few report files are available when the workspace contains general Zurich migration context.
- Use ZURICH_REPORT_INVENTORY as the authoritative list of report files available for per-report detail.
- If the user asks for "cada uno", include one subsection per report from ZURICH_REPORT_INVENTORY.
- Do not output placeholders such as "[NOMBRE_DEL_REPORTE]", "[...]", "[DESCRIPCION]" or instructions to manually fill the report.
- Do not invent a Squad UI download flow. The frontend will show the Docs Squad button when the answer is ready.
- If the user asks for an informe general, produce a general executive/technical report covering the migration as a whole.
- If the user explicitly asks for "detallado", "minucioso", "completo", "extenso", "profundo" or "exhaustivo", expand the report with more sections, risks, methodology, QA, architecture, lessons learned and operational conclusions.
- If the available workspace context mentions 32 but the user asks for 31, respect the user's requested count in the report and avoid arguing about the discrepancy unless it materially affects a specific calculation.
- Use Markdown and avoid tables unless they make the report clearer.` : ""}

ANTI_HALLUCINATION_RULES:
- Do not invent visible content, labels, data, names, numbers, logos, icons, colors or layout elements.
- If something is unreadable, missing or approximate, say it explicitly.
- Never use external CSS/JS files.
- Never use invented image filenames.
- Never generate broken local image paths.
- Valid image src values are only:
  1. exact uploaded asset filenames listed in UPLOADED_ASSETS;
  2. inline SVG;
  3. CSS-only shapes;
  4. visible remote HTTPS URLs;
  5. data URLs generated by the preview system.
- Valid uploaded image filenames are: ${validImageAssetNames}.

FILE_ATTACHED: ${hasFile ? "YES" : "NO"}
IMAGE_ATTACHED: ${hasImage ? "YES" : "NO"}
PDF_ATTACHED: ${hasPdf ? "YES" : "NO"}
REQUESTED_FILE_TASK: ${shouldGenerateVisualOutput ? "VISUAL_REPLICATION" : "CONTENT_ANALYSIS"}

SOURCE_REFERENCES:
${sourceReferencesList}

UPLOADED_ASSETS:
${uploadedAssetsList}

FILES_IN_WORKSPACE_BUFFER:
${fileList.join(" | ") || "NONE"}

CURRENT_DATA_STREAM:
${contextFromDocs || "WAITING_FOR_COMMANDS"}`;

    const maxOutputTokens = shouldGenerateVisualOutput
      ? visualOutputTokenLimit
      : textOutputTokenLimit;

    const stream = await createProviderTextStream({
      messages,
      uploadedFiles,
      systemPrompt,
      maxOutputTokens,
      isVisualRequest: shouldGenerateVisualOutput,
    });

    if (shouldGenerateVisualOutput) {
      const rawOutputText = await readTextStream(stream);
      const outputText = normalizeVisualMarkdown(rawOutputText);
      const validation = validateVisualReplicationOutput(outputText);

      if (!validation.ok) {
        const localMockOutput = buildLocalMockArtifact(
          lastUserMessage,
          validation.issues.join("; ") || rawOutputText.slice(0, 280)
        );

        return new Response(buildPlainTextStream(localMockOutput), {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });

        return new Response(
          buildPlainTextStream(
            [
              "La réplica visual generada fue rechazada por control de calidad.",
              "",
              "Problemas detectados:",
              ...validation.issues.map((issue) => `- ${issue}`),
              "",
              "Detalle técnico:",
              `- Proveedor principal: ${aiProvider}`,
              `- OpenRouter Vision Fallback: ${
                enableOpenRouterVisualFallback ? "activo" : "inactivo"
              }`,
              `- Modelos vision configurados: ${openRouterVisionModelList.join(
                ", "
              )}`,
              "",
              "Probá reenviar la imagen con una instrucción visual más específica o cambiá de proveedor/modelo.",
            ].join("\n")
          ),
          {
            status: 422,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          }
        );
      }

      return new Response(buildPlainTextStream(outputText), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("MARTWIN_CHAT_FAILURE:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido en /api/chat.";

    if (
      message.includes("VISUAL_PROVIDER_CHAIN_FAILED") ||
      message.includes("GEMINI_HTTP_429")
    ) {
      const retryMatch = message.match(/retry in ([\d.]+)s/i);
      const retrySeconds = retryMatch?.[1]
        ? Math.ceil(Number(retryMatch[1]))
        : 60;

      return new Response(
        [
          "Los proveedores visuales están temporalmente limitados.",
          "",
          "OpenAI no tiene cuota disponible y Gemini alcanzó el límite o falló.",
          "",
          enableOpenRouterVisualFallback
            ? "OpenRouter Vision Fallback está activo, pero no logró devolver una respuesta visual utilizable en este intento."
            : "OpenRouter Vision Fallback está desactivado.",
          "",
          `Reintentá en aproximadamente ${retrySeconds} segundos.`,
          "",
          "Detalle técnico:",
          `- OPENROUTER_VISION_MODEL_LIST=${openRouterVisionModelList.join(",")}`,
        ].join("\n"),
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    if (isQuotaError(error)) {
      return new Response(
        [
          "No pude completar la consulta porque la API devolvió 429 por cuota insuficiente.",
          "",
          "Solución práctica:",
          "- mantené AI_PROVIDER=openai;",
          "- asegurá ENABLE_GEMINI_FALLBACK=true;",
          "- asegurá ENABLE_OPENROUTER_VISUAL_FALLBACK=true si querés probar modelos vision gratuitos;",
          "- reiniciá npm run dev o rebuild si estás en producción.",
        ].join("\n"),
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    return new Response(
      [
        "CHAT_SYSTEM_ERROR",
        "",
        message,
        "",
        "Revisá las variables de entorno y la consola del servidor.",
      ].join("\n"),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  }
}
