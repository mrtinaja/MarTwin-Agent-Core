"use client";

export const dynamic = "force-dynamic";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import {
  BrainCircuit,
  Activity,
  Terminal,
  Copy,
  Check,
  Cpu,
  SendHorizontal,
  Bot,
  User,
  ImageIcon,
  X,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type ChatRole = "user" | "assistant";

type UploadedFile = {
  name: string;
  type: string;
  dataUrl: string;
};

type FileTaskMode = "analysis" | "visual";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachments?: UploadedFile[];
};

type CodeBlockProps = {
  language?: string;
  value: string;
  onCopy: (code: string, id: string) => void;
  copiedId: string | null;
  blockId: string;
};

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
};

const initialMessages: ChatMessage[] = [
  {
    id: "init",
    role: "assistant",
    content:
      "Hola, soy el asistente tecnico de **Pago TIC**. Puedo ayudarte con desarrollo, analisis de codigo, documentacion, QA, debugging, arquitectura y automatizacion.",
  },
];

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const allowedExtensionRegex = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;

const CodeBlock = ({
  language,
  value,
  onCopy,
  copiedId,
  blockId,
}: CodeBlockProps) => {
  return (
    <div className="relative my-6 max-w-full overflow-hidden rounded-2xl bg-[#1e1248] shadow-xl group border border-gray-800">
      <div className="bg-[#1e1248] px-4 py-2 border-b border-white/10 text-[10px] text-gray-400 font-normal uppercase flex justify-between items-center">
        <span className="flex items-center gap-2">
          <Terminal size={12} className="text-[#e50051]" />
          {language || "code"}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCopy(value, blockId);
          }}
          className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg border border-white/10 active:scale-95"
        >
          {copiedId === blockId ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} />
          )}

          {copiedId === blockId ? "COPIADO" : "COPIAR"}
        </button>
      </div>

      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: "transparent",
          padding: "1.5rem",
          fontSize: "12px",
          lineHeight: "1.6",
          overflowX: "auto",
          maxWidth: "100%",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

function extractCodeBlock(content: string, language: string) {
  const regex = new RegExp("```" + language + "\\s*([\\s\\S]*?)```", "i");
  const match = content.match(regex);

  return match?.[1]?.trim() || "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAssetFileNameVariants(fileName: string) {
  const cleanName = fileName.trim();
  const encodedName = encodeURIComponent(cleanName);

  return [
    cleanName,
    `./${cleanName}`,
    `/${cleanName}`,
    encodedName,
    `./${encodedName}`,
    `/${encodedName}`,
  ];
}

function replaceAssetReferences(htmlOrCss: string, assets: UploadedFile[]) {
  let nextValue = htmlOrCss;

  for (const asset of assets) {
    if (!asset.type.startsWith("image/")) continue;

    const variants = getAssetFileNameVariants(asset.name);

    for (const variant of variants) {
      const escapedVariant = escapeRegExp(variant);

      nextValue = nextValue.replace(
        new RegExp(`src=["']${escapedVariant}["']`, "gi"),
        `src="${asset.dataUrl}"`
      );

      nextValue = nextValue.replace(
        new RegExp(`url\\(["']?${escapedVariant}["']?\\)`, "gi"),
        `url("${asset.dataUrl}")`
      );
    }
  }

  return nextValue;
}

function stripExternalGeneratedReferences(html: string) {
  let nextHtml = html;

  nextHtml = nextHtml.replace(
    /<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi,
    ""
  );

  nextHtml = nextHtml.replace(
    /<link\b[^>]*href=["'][^"']*\.(css|js)["'][^>]*>/gi,
    ""
  );

  nextHtml = nextHtml.replace(
    /<script\b[^>]*src=["'][^"']+["'][^>]*><\/script>/gi,
    ""
  );

  nextHtml = nextHtml.replace(
    /<script\b[^>]*src=["'][^"']+["'][^>]*\/?>/gi,
    ""
  );

  nextHtml = nextHtml.replace(
    /\s(?:href|src)=["'](?:\.\/|\/)?(?:style\.css|styles\.css|main\.css|app\.css|script\.js|main\.js|app\.js)["']/gi,
    ""
  );

  return nextHtml;
}

function neutralizeUnknownImageSources(html: string, assets: UploadedFile[]) {
  const assetNames = assets
    .filter((asset) => asset.type.startsWith("image/"))
    .flatMap((asset) => getAssetFileNameVariants(asset.name))
    .map((name) => name.toLowerCase());

  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (fullMatch, beforeSrc, src, afterSrc) => {
      const normalizedSrc = String(src).trim().toLowerCase();

      const isSafeSrc =
        normalizedSrc.startsWith("data:") ||
        normalizedSrc.startsWith("http://") ||
        normalizedSrc.startsWith("https://") ||
        assetNames.includes(normalizedSrc);

      if (isSafeSrc) {
        return fullMatch;
      }

      const safeTitle = String(src).replace(/"/g, "&quot;");

      return `<span${beforeSrc}${afterSrc} class="missing-generated-asset" title="Asset no disponible: ${safeTitle}"></span>`;
    }
  );
}

function sanitizeGeneratedCss(css: string) {
  let nextCss = css;

  nextCss = nextCss.replace(/@import\s+url\([^)]*\)\s*;?/gi, "");
  nextCss = nextCss.replace(/@import\s+["'][^"']+["']\s*;?/gi, "");

  nextCss = nextCss.replace(
    /url\(["']?(?:\.\/|\/)?(?:style\.css|styles\.css|main\.css|app\.css|script\.js|main\.js|app\.js)["']?\)/gi,
    "none"
  );

  return nextCss;
}

function shouldUseWidePreview(content: string) {
  const lowerContent = content.toLowerCase();

  return (
    lowerContent.includes("logo") ||
    lowerContent.includes("splash") ||
    lowerContent.includes("brand") ||
    lowerContent.includes("banner") ||
    lowerContent.includes("placa") ||
    lowerContent.includes("maja") ||
    lowerContent.includes("diseño") ||
    lowerContent.includes("<img")
  );
}

function buildPreviewHtml(content: string, assets: UploadedFile[] = []) {
  const rawHtml = extractCodeBlock(content, "html");
  const rawCss = extractCodeBlock(content, "css");

  if (!rawHtml && !rawCss) return "";

  const htmlWithAssets = replaceAssetReferences(rawHtml, assets);
  const htmlWithoutExternalRefs = stripExternalGeneratedReferences(
    htmlWithAssets
  );
  const html = neutralizeUnknownImageSources(htmlWithoutExternalRefs, assets);

  const cssWithAssets = replaceAssetReferences(rawCss, assets);
  const css = sanitizeGeneratedCss(cssWithAssets);

  const baseCss = `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      background: #ffffff;
      overflow-x: auto;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    .missing-generated-asset {
      display: inline-block;
      width: 0;
      height: 0;
      overflow: hidden;
      visibility: hidden;
    }
  `;

  const finalCss = `${baseCss}\n${css}`;

  const htmlHasDocument =
    html.toLowerCase().includes("<!doctype") ||
    html.toLowerCase().includes("<html");

  if (htmlHasDocument) {
    let finalHtml = html;

    finalHtml = stripExternalGeneratedReferences(finalHtml);

    if (finalHtml.toLowerCase().includes("</head>")) {
      finalHtml = finalHtml.replace(
        /<\/head>/i,
        `<style>${finalCss}</style></head>`
      );
    } else if (finalHtml.toLowerCase().includes("<body")) {
      finalHtml = finalHtml.replace(
        /<body([^>]*)>/i,
        `<head><style>${finalCss}</style></head><body$1>`
      );
    } else {
      finalHtml = `${finalHtml}<style>${finalCss}</style>`;
    }

    return finalHtml;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    ${finalCss}
  </style>
</head>

<body>
  ${html}
</body>
</html>
`;
}

const HtmlPreview = ({
  content,
  assets = [],
}: {
  content: string;
  assets?: UploadedFile[];
}) => {
  const previewHtml = buildPreviewHtml(content, assets);

  if (!previewHtml) return null;

  const widePreview = shouldUseWidePreview(content);

  const openPreview = () => {
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
  };

  return (
    <div className="mt-6 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300">
            Vista previa HTML
          </p>
          <p className="text-[10px] text-gray-500">
            Renderizado local desde el código generado
          </p>
        </div>

        <button
          type="button"
          onClick={openPreview}
          className="rounded-xl bg-[#e50051] px-4 py-2 text-[10px] uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
        >
          Abrir
        </button>
      </div>

      <div className="bg-[#05020f] p-6 overflow-x-auto">
        <div className="mx-auto w-fit rounded-[2rem] border border-white/10 bg-black p-2 shadow-2xl">
          <iframe
            title="HTML Preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts"
            className={
              widePreview
                ? "h-[720px] w-[960px] max-w-[calc(100vw-9rem)] rounded-[1.5rem] bg-white"
                : "h-[760px] w-[390px] rounded-[1.5rem] bg-white"
            }
          />
        </div>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileTaskMode, setFileTaskMode] = useState<FileTaskMode>("analysis");

  useEffect(() => {
    setMounted(true);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const generateId = useCallback((prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const fileToDataUrl = useCallback((file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl: String(reader.result),
        });
      };

      reader.onerror = () => {
        reject(reader.error);
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const getDefaultFilePrompt = useCallback((mode: FileTaskMode) => {
    if (mode === "visual") {
      return `Replicá visualmente el archivo adjunto con máxima precisión posible en una sola pasada.

Reglas obligatorias:
- No hagas doble revisión ni segunda pasada.
- No rediseñes.
- No inventes contenido.
- No agregues datos que no estén visibles.
- No inventes nombres de imágenes.
- No uses <link rel="stylesheet" href="style.css">.
- No uses archivos CSS externos.
- No uses scripts externos.
- Generá HTML y CSS separados en bloques markdown completos.
- El bloque HTML debe estar cerrado.
- El bloque CSS debe estar cerrado.
- Si hay assets adjuntos, referencialos por su nombre exacto.

Modo de fidelidad exacta:
- Si el adjunto es un logo, placa gráfica, splash, banner, card, poster o composición visual cerrada, usá la imagen adjunta como asset principal.
- No redibujes el logo con SVG/CSS si lo que se busca es fidelidad exacta.
- Usá <img src="NOMBRE_EXACTO_DEL_ARCHIVO" /> con el nombre exacto del archivo adjunto.
- El preview va a reemplazar ese nombre por la imagen real.
- Mantené proporción, centrado, tamaño, fondo, aire y encuadre.
- Usá object-fit: contain.
- Construí con CSS el viewport, fondo, contenedor, centrado, espaciado y escala.
- Solo redibujá en CSS/SVG si te pido explícitamente “sin usar la imagen”, “reconstrucción vectorial” o “redibujalo”.

Si no usás asset exacto:
- Antes de generar, estimá internamente canvas, posiciones, tamaños, espaciados, colores y tipografías.
- Priorizá fidelidad visual por encima de código limpio o componentes genéricos.
- Usá medidas px, anchos fijos y posicionamiento explícito cuando mejore el parecido.
- No centres ni redistribuyas elementos salvo que el original lo haga.
- Si algo no se puede leer o detectar, marcalo como aproximado.

Reglas estrictas de texto visible:
- No interpretes la marca.
- No cambies el texto visible.
- No separes palabras si en la imagen están juntas.
- No unas palabras si en la imagen están separadas.
- No traduzcas, reformules ni corrijas nombres.
- No agregues palabras por contexto.
- No saques palabras visibles.
- Copiá exactamente los textos visibles.
- Conservá mayúsculas, minúsculas, acentos, espacios y unión de palabras.

Control de salida:
- Agregá un control visual con diferencias esperadas y elementos aproximados.
- Indicá si usaste asset exacto o reconstrucción.
- Indicá viewport usado.
- Indicá escala general aplicada.
- Indicá proporción aproximada imagen/fondo.`;
    }

    return `Analizá el contenido del archivo adjunto sin inventar información.

Objetivo:
- resumí lo importante;
- extraé datos, reglas, requisitos o hallazgos relevantes;
- si es una imagen, describí y analizá lo visible;
- si es un PDF, separá resumen, puntos clave y posibles acciones;
- no generes HTML/CSS ni preview salvo que lo pida explícitamente.`;
  }, []);

  const applyFileTaskMode = useCallback(
    (mode: FileTaskMode) => {
      setFileTaskMode(mode);

      if (uploadedFiles.length > 0) {
        setInput(getDefaultFilePrompt(mode));
      }
    },
    [getDefaultFilePrompt, uploadedFiles.length]
  );

  const loadFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((file) => {
        const isAllowedByMime = allowedMimeTypes.includes(file.type);
        const isAllowedByExtension = allowedExtensionRegex.test(file.name);

        return isAllowedByMime || isAllowedByExtension;
      });

      if (!validFiles.length) {
        console.warn("[PagoTIC_LoadFiles_Debug] No valid files selected");
        return;
      }

      const nextFiles = await Promise.all(validFiles.map(fileToDataUrl));

      setUploadedFiles(nextFiles);

      if (!input.trim()) {
        setInput(getDefaultFilePrompt(fileTaskMode));
      }

      console.log("[PagoTIC_LoadFiles_Debug]", {
        files: nextFiles.length,
        names: nextFiles.map((file) => file.name),
        types: nextFiles.map((file) => file.type),
      });
    },
    [fileToDataUrl, input, getDefaultFilePrompt, fileTaskMode]
  );

  const handleFilePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLElement>) => {
      const filesFromClipboard = Array.from(event.clipboardData.files);

      const filesFromItems = Array.from(event.clipboardData.items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      const pastedFiles = [...filesFromClipboard, ...filesFromItems];

      const validFiles = pastedFiles.filter((file) => {
        const isAllowedByMime = allowedMimeTypes.includes(file.type);
        const isAllowedByExtension = allowedExtensionRegex.test(file.name);

        return isAllowedByMime || isAllowedByExtension;
      });

      if (!validFiles.length) {
        console.log("[PagoTIC_Paste_Debug] No valid file found in clipboard", {
          files: filesFromClipboard.length,
          items: event.clipboardData.items.length,
          itemTypes: Array.from(event.clipboardData.items).map(
            (item) => item.type
          ),
        });

        return;
      }

      event.preventDefault();

      console.log("[PagoTIC_Paste_Debug] Valid file found", {
        files: validFiles.length,
        names: validFiles.map((file) => file.name),
        types: validFiles.map((file) => file.type),
      });

      await loadFiles(validFiles);
    },
    [loadFiles]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      if (!files || !files.length) return;

      await loadFiles(Array.from(files));
    },
    [loadFiles]
  );

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setFileTaskMode("analysis");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCopy = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedBlockId(id);

      setTimeout(() => {
        setCopiedBlockId(null);
      }, 2000);
    });
  }, []);

  const handleChatSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedInput = input.trim();
      const currentUploadedFiles = [...uploadedFiles];

      if (!trimmedInput && !currentUploadedFiles.length) {
        return;
      }

      const userMessage: ChatMessage = {
        id: generateId("user"),
        role: "user",
        content:
          trimmedInput ||
          "Analizá el archivo adjunto y generá una respuesta técnica útil sin inventar contenido.",
        attachments: currentUploadedFiles,
      };

      const assistantMessageId = generateId("assistant");

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        attachments: currentUploadedFiles,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        assistantMessage,
      ]);

      setInput("");
      setIsLoading(true);

      console.log("[PagoTIC_Submit_Debug]", {
        inputLength: userMessage.content.length,
        uploadedFiles: currentUploadedFiles.length,
        names: currentUploadedFiles.map((file) => file.name),
        types: currentUploadedFiles.map((file) => file.type),
        fileTaskMode,
      });

      clearFiles();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            uploadedFiles: currentUploadedFiles,
            fileTaskMode,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content:
                      errorText ||
                      `El backend respondió con error HTTP ${response.status}.`,
                    attachments: currentUploadedFiles,
                  }
                : message
            )
          );

          return;
        }

        if (!response.body) {
          throw new Error(`HTTP_ERROR_${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let assistantContent = "";

        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          assistantContent += decoder.decode(value, { stream: true });

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: assistantContent,
                    attachments: currentUploadedFiles,
                  }
                : message
            )
          );
        }

        if (!assistantContent.trim()) {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content:
                      "No recibí respuesta del modelo. Revisá la consola del backend para ver si hubo error en `/api/chat`.",
                    attachments: currentUploadedFiles,
                  }
                : message
            )
          );
        }
      } catch (error) {
        console.error("PAGOTIC_FRONT_CHAT_FAILURE:", error);

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content:
                    "Ocurrió un error al consultar el backend. Revisá la consola de Next para ver el detalle.",
                  attachments: currentUploadedFiles,
                }
              : message
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, uploadedFiles, messages, generateId, clearFiles, fileTaskMode]
  );

  if (!mounted) {
    return <div className="h-screen bg-gray-50" />;
  }

  return (
    <div
      onPaste={handleFilePaste}
      className="flex flex-col h-screen bg-gray-50 text-[#1e1248] font-sans overflow-hidden relative"
    >
      <header className="shrink-0 p-6 bg-white border-b border-gray-100 flex justify-between items-center z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1e1248] rounded-2xl shadow-lg shadow-[#1e1248]/20">
            <BrainCircuit size={20} className="text-white" />
          </div>

          <div>
            <h2 className="text-sm font-normal tracking-tight text-[#1e1248] uppercase">
              Pago TIC{" "}
              <span className="text-[#e50051]">AI Assistant</span>
            </h2>

            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isLoading ? "bg-[#e50051] animate-pulse" : "bg-green-500"
                }`}
              />

              <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">
                {isLoading ? "IA procesando..." : "Sistema en linea"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl">
          <Cpu size={14} className="text-[#1e1248]" />
          <span className="text-[10px] font-normal text-[#1e1248]/60 uppercase tracking-tighter">
            Model: <span className="text-[#e50051]">Auto Fallback</span>
          </span>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 md:p-12 space-y-8 custom-scrollbar pb-6"
      >
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex min-w-0 ${
              message.role === "user" ? "justify-end" : "justify-start"
            } animate-in fade-in slide-in-from-bottom-4 duration-300`}
          >
            <div
              className={`flex min-w-0 gap-4 max-w-[85%] md:max-w-[70%] ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border ${
                  message.role === "user"
                    ? "bg-white border-gray-100 text-[#1e1248]"
                    : "bg-[#1e1248] border-[#1e1248] text-white"
                }`}
              >
                {message.role === "user" ? (
                  <User size={18} />
                ) : (
                  <Bot size={18} className="text-[#e50051]" />
                )}
              </div>

              <div
                className={`min-w-0 max-w-full overflow-hidden p-6 rounded-[2rem] text-[14px] leading-relaxed shadow-sm border ${
                  message.role === "user"
                    ? "bg-white border-gray-100 rounded-tr-none text-[#1e1248]"
                    : "bg-[#1e1248] border-[#1e1248] rounded-tl-none text-gray-100"
                }`}
              >
                <div className="prose prose-sm max-w-none min-w-0 overflow-hidden prose-p:leading-relaxed prose-strong:text-inherit prose-strong:font-normal">
                  <ReactMarkdown
                    components={{
                      code({
                        inline,
                        className,
                        children,
                        ...props
                      }: MarkdownCodeProps) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeContent = String(children).replace(/\n$/, "");
                        const blockId = `block-${
                          message.id || index
                        }-${codeContent.length}`;
                        const isInline = inline || !match;

                        if (!isInline && match) {
                          return (
                            <CodeBlock
                              language={match[1]}
                              value={codeContent}
                              onCopy={handleCopy}
                              copiedId={copiedBlockId}
                              blockId={blockId}
                            />
                          );
                        }

                        return (
                          <code
                            className="bg-[#e50051]/10 px-1.5 py-0.5 rounded text-[#e50051] font-normal"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {message.role === "assistant" && (
                    <HtmlPreview
                      content={message.content}
                      assets={message.attachments || []}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex gap-4 max-w-[85%] md:max-w-[70%]">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border bg-[#1e1248] border-[#1e1248] text-white">
                <Bot size={18} className="text-[#e50051]" />
              </div>

              <div className="p-6 rounded-[2rem] rounded-tl-none text-[14px] leading-relaxed shadow-sm border bg-[#1e1248] border-[#1e1248] text-gray-100">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-300">
                  <Activity
                    size={14}
                    className="text-[#e50051] animate-pulse"
                  />
                  Analizando...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="shrink-0 w-full px-6 py-4 bg-[#05020f] border-t border-white/10 z-40">
        <form onSubmit={handleChatSubmit} className="max-w-4xl mx-auto">
          {uploadedFiles.length > 0 && (
            <div className="mb-4 max-w-full overflow-hidden bg-white border border-gray-100 rounded-2xl p-3 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-normal text-[#1e1248] uppercase">
                    Archivo cargado
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Se enviará junto con tu consulta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearFiles}
                  className="w-9 h-9 rounded-xl text-xs uppercase bg-gray-100 hover:bg-[#e50051] hover:text-white transition-all flex items-center justify-center"
                  title="Quitar archivos"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => applyFileTaskMode("analysis")}
                  className={`rounded-xl px-3 py-2 text-[10px] uppercase tracking-widest transition-all ${
                    fileTaskMode === "analysis"
                      ? "bg-[#1e1248] text-white"
                      : "text-[#1e1248] hover:bg-white"
                  }`}
                >
                  Analizar contenido
                </button>

                <button
                  type="button"
                  onClick={() => applyFileTaskMode("visual")}
                  className={`rounded-xl px-3 py-2 text-[10px] uppercase tracking-widest transition-all ${
                    fileTaskMode === "visual"
                      ? "bg-[#e50051] text-white"
                      : "text-[#1e1248] hover:bg-white"
                  }`}
                >
                  Replicar visual
                </button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {uploadedFiles.map((file, fileIndex) => {
                  const isImage = file.type.startsWith("image/");
                  const isPdf =
                    file.type === "application/pdf" ||
                    file.name.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={`${file.name}-${fileIndex}`}
                      className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      {isImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          />
                        </>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-[#1e1248] text-white flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                      )}

                      <div className="max-w-[220px]">
                        <p className="truncate text-[11px] text-[#1e1248]">
                          {file.name || (isPdf ? "documento.pdf" : "archivo")}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {isPdf ? "PDF" : file.type || "archivo"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className={`flex items-center bg-white rounded-[2.5rem] border p-2 transition-all duration-300 shadow-xl ${
              isLoading
                ? "border-[#e50051] ring-4 ring-[#e50051]/5"
                : "border-gray-100 focus-within:border-[#1e1248] focus-within:ring-4 focus-within:ring-[#1e1248]/5"
            }`}
          >
            <div className="p-4 text-gray-300">
              <Activity
                size={20}
                className={isLoading ? "text-[#e50051] animate-pulse" : ""}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs uppercase bg-gray-100 text-[#1e1248] hover:bg-[#e50051] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon size={16} />
              Archivo
            </button>

            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-transparent px-4 py-4 text-sm text-[#1e1248] outline-none placeholder:text-gray-400 font-normal"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={handleFilePaste}
              placeholder={
                isLoading
                  ? "IA analizando requerimiento..."
                  : "Escribe tu consulta o adjunta imagen/PDF..."
              }
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !uploadedFiles.length)}
              className={`flex items-center gap-2 px-8 py-4 rounded-[2rem] font-normal text-xs uppercase tracking-widest transition-all ${
                isLoading || (!input.trim() && !uploadedFiles.length)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#1e1248] text-white hover:bg-[#e50051] shadow-lg shadow-[#1e1248]/20 hover:shadow-[#e50051]/20 active:scale-95"
              }`}
            >
              {isLoading ? (
                "..."
              ) : (
                <>
                  <SendHorizontal size={16} />
                  Enviar
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-4 font-normal uppercase tracking-[0.2em]">
            Pago TIC IT Development Core // Secure Workspace
          </p>
        </form>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e124822;
          border-radius: 10px;
        }

        .prose {
          max-width: 100%;
        }

        .prose strong {
          color: inherit;
          font-weight: 400;
        }

        .prose code {
          color: #e50051;
          word-break: normal;
        }

        .prose pre {
          background: transparent;
          padding: 0;
          margin: 0;
          max-width: 100%;
          overflow-x: auto;
        }

        .prose p,
        .prose li {
          overflow-wrap: anywhere;
        }

        iframe {
          max-width: none;
        }
      `}</style>
    </div>
  );
}