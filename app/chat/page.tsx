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
  Download,
  FileImage,
  Printer,
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
  docsSquadEnabled?: boolean;
  docsSquadSource?: string;
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
      "Hola, soy el asistente tecnico de **MarTwin**. Puedo ayudarte con desarrollo, analisis de codigo, documentacion, QA, debugging, arquitectura y automatizacion.",
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

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeForInlineScript(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
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

function getExportDocumentParts(previewHtml: string) {
  const styles = Array.from(
    previewHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  )
    .map((match) => match[1])
    .join("\n");
  const bodyMatch = previewHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] || previewHtml;

  return { styles, body };
}

function createArtifactFileName(extension: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return `martwin-artifact-${stamp}.${extension}`;
}

function normalizeReportDisplayTitle(value: string) {
  const cleanValue = String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanValue) {
    return "Informe Docs Squad";
  }

  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
}

function extractExplicitTitle(value: string) {
  const rawValue = String(value || "").replace(/\s+/g, " ").trim();

  const explicitTitleMatch = rawValue.match(/\bt[ií]tulo\s+(.+)$/i);

  if (!explicitTitleMatch?.[1]) {
    return "";
  }

  return explicitTitleMatch[1]
    .replace(
      /\s+(necesito|quiero|debo|tengo que|para|descarga|descargar|bajar|drive|template|plantilla|word|docx)\b.*$/i,
      ""
    )
    .replace(/\s+\d{4}-\d{2}-\d{2}\s+\d{3,4}$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanReportTitleCandidate(value: string) {
  const explicitTitle = extractExplicitTitle(value);

  let nextValue =
    explicitTitle ||
    String(value || "")
      .replace(/\r\n/g, "\n")
      .split("\n")[0]
      .trim();

  nextValue = nextValue
    .replace(/[¿?¡!]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  nextValue = nextValue.replace(
    /^(informe\s+)?(ahora\s+)?(usando\s+)?(el\s+)?(t[ií]tulo\s+)?/i,
    ""
  );

  nextValue = nextValue.replace(
    /^(por favor\s+)?(me\s+)?(podrias\s+|podrías\s+)?(generame|generá|genera|generar|dame|dá|quiero|necesito|armame|arma|armar|haceme|hace|hacer|creame|crea|crear|preparame|prepara|preparar|pasame|pasar|exportame|exportar|descargame|descarga|descargar|bajame|bajalo|bajar)\s+/i,
    ""
  );

  nextValue = nextValue.replace(/^(un|una|el|la|los|las)\s+/i, "");

  nextValue = nextValue.replace(
    /\b(apara|para)\s+(descargar|descarga|bajar|exportar|google docs|docs|word|docx|drive)\b.*$/i,
    ""
  );

  nextValue = nextValue.replace(
    /\b(con|usando|en)\s+(el\s+)?(template|plantilla)\s+(corporativo\s+)?(squad|martwin)?\b.*$/i,
    ""
  );

  nextValue = nextValue
    .replace(/\bde\s+(la|el|los|las|un|una)\s+/gi, "de ")
    .replace(/\bde\s+como\s+se\s+/i, "de cómo se ")
    .replace(/\bcomo\s+se\s+/i, "cómo se ")
    .replace(/\s+\d{4}-\d{2}-\d{2}\s+\d{3,4}$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!nextValue) {
    return "Informe Docs Squad";
  }

  if (
    !/^informe\b/i.test(nextValue) &&
    /arquitectura|infraestructura|configuracion|configuración|emailpdf|documentacion|documentación|sistema|api|reporte|analisis|análisis|html|migracion|migración|zurich/i.test(
      nextValue
    )
  ) {
    return normalizeReportDisplayTitle(`Informe de ${nextValue}`);
  }

  return normalizeReportDisplayTitle(nextValue);
}

function getContentFallbackTitle(content: string) {
  const markdownTitle = content.match(/^#\s+(.+)$/m)?.[1]?.trim();

  if (markdownTitle) {
    return markdownTitle;
  }

  return (
    content
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => {
        return (
          line &&
          !line.startsWith("CONTENT_END") &&
          !line.startsWith("|") &&
          !line.startsWith("---")
        );
      }) || "Informe Docs Squad"
  );
}

function createDocsSquadTitle(content: string, source?: string) {
  const rawTitle = source?.trim()
    ? cleanReportTitleCandidate(source)
    : cleanReportTitleCandidate(getContentFallbackTitle(content));

  return normalizeReportDisplayTitle(rawTitle || "Informe Docs Squad");
}

function createDocsSquadFileNameFromTitle(title: string) {
  const safeTitle = normalizeReportDisplayTitle(title)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace("T", " ")
    .replace(":", "");

  return `${safeTitle || "Informe Docs Squad"} ${stamp}.docx`;
}

function createDocsSquadFileName(content: string, source?: string) {
  const rawTitle = createDocsSquadTitle(content, source);

  return createDocsSquadFileNameFromTitle(rawTitle);
}

function stripMarkdownForDocx(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[a-z0-9-]*\n?/i, "").replace(/```$/g, "")
    )
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function getMarkdownHeadings(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim())
    .filter((heading): heading is string => Boolean(heading))
    .slice(0, 8);
}

function getFirstUsefulParagraph(content: string) {
  return (
    content
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => {
        return (
          line &&
          !line.startsWith("#") &&
          !line.startsWith("|") &&
          !line.startsWith("---") &&
          !line.startsWith("CONTENT_END") &&
          line.length > 40
        );
      }) || ""
  );
}

function buildDocsSquadMetadata(
  content: string,
  source?: string,
  customTitle?: string
) {
  const title = customTitle
    ? normalizeReportDisplayTitle(customTitle)
    : createDocsSquadTitle(content, source);

  const headings = getMarkdownHeadings(content);
  const firstParagraph = getFirstUsefulParagraph(content);
  const generatedAt = new Date().toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const topic = title.replace(/^informe\s+de\s+/i, "").trim();

  const description = firstParagraph
    ? firstParagraph.slice(0, 700)
    : `Informe técnico generado sobre ${topic}.`;

  const references = [
    `Tipo: Informe técnico`,
    `Tema: ${topic}`,
    `Origen: MarTwin AI Assistant`,
    `Fecha de generación: ${generatedAt}`,
    headings.length ? `Secciones detectadas: ${headings.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const changes = headings.length
    ? `Se generó un documento estructurado sobre ${topic}. El contenido incluye las secciones principales: ${headings.join(", ")}.`
    : `Se generó un documento técnico sobre ${topic}, organizado a partir de la respuesta producida por MarTwin AI Assistant.`;

  return {
    title,
    description,
    references,
    changes,
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shouldEnableDocsSquad(input: string) {
  const normalizedInput = normalizeSearchText(input);

  const docsSquadKeywords = ["descarga", "bajar", "drive", "template"];

  return docsSquadKeywords.some((keyword) => normalizedInput.includes(keyword));
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parsePreviewDocument(previewHtml: string) {
  return new DOMParser().parseFromString(previewHtml, "text/html");
}

function getPreviewTableRows(previewHtml: string) {
  const document = parsePreviewDocument(previewHtml);
  const table = document.querySelector("table");

  if (table) {
    return Array.from(table.querySelectorAll("tr"))
      .map((row) =>
        Array.from(row.querySelectorAll("th,td")).map((cell) =>
          (cell.textContent || "").replace(/\s+/g, " ").trim()
        )
      )
      .filter((row) => row.some(Boolean));
  }

  const contentRows = Array.from(
    document.body.querySelectorAll("h1,h2,h3,p,li,dt,dd")
  )
    .map((element) => [
      element.tagName.toLowerCase(),
      (element.textContent || "").replace(/\s+/g, " ").trim(),
    ])
    .filter((row) => row[1]);

  return [["tipo", "contenido"], ...contentRows];
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(previewHtml: string) {
  return getPreviewTableRows(previewHtml)
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
}

function buildXlsHtml(previewHtml: string) {
  const document = parsePreviewDocument(previewHtml);
  const table = document.querySelector("table");

  if (table) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  ${table.outerHTML}
</body>
</html>`;
  }

  const rows = getPreviewTableRows(previewHtml);
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td>${cell
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  <table>${tableRows}</table>
</body>
</html>`;
}

function buildExportSvg(previewHtml: string, width: number, height: number) {
  const { styles, body } = getExportDocumentParts(previewHtml);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>
        html, body { margin: 0; width: ${width}px; min-height: ${height}px; overflow: hidden; }
        ${styles}
      </style>
      ${body}
    </div>
  </foreignObject>
</svg>`;
}

async function rasterizeSvg(
  svgText: string,
  width: number,
  height: number,
  mimeType: "image/png" | "image/jpeg" | "image/gif"
) {
  const svgBlob = new Blob([svgText], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("No se pudo rasterizar el artefacto."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas no disponible para exportar la imagen.");
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("El navegador no pudo crear el archivo."));
            return;
          }

          resolve(blob);
        },
        mimeType,
        0.94
      );
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

const HtmlPreview = ({
  content,
  assets = [],
}: {
  content: string;
  assets?: UploadedFile[];
}) => {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const previewHtml = buildPreviewHtml(content, assets);

  if (!previewHtml) return null;

  const widePreview = shouldUseWidePreview(content);
  const exportWidth = widePreview ? 960 : 390;
  const exportHeight = widePreview ? 720 : 760;

  const openPreview = () => {
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
  };

  const exportHtml = () => {
    downloadBlob(
      new Blob([previewHtml], { type: "text/html;charset=utf-8" }),
      createArtifactFileName("html")
    );
  };

  const exportSvg = () => {
    const svgText = buildExportSvg(previewHtml, exportWidth, exportHeight);

    downloadBlob(
      new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
      createArtifactFileName("svg")
    );
  };

  const exportRaster = async (
    extension: "png" | "jpg" | "gif",
    mimeType: "image/png" | "image/jpeg" | "image/gif"
  ) => {
    setExportingFormat(extension);

    try {
      const svgText = buildExportSvg(previewHtml, exportWidth, exportHeight);
      const blob = await rasterizeSvg(
        svgText,
        exportWidth,
        exportHeight,
        mimeType
      );

      if (mimeType === "image/gif" && blob.type !== "image/gif") {
        window.alert(
          "Este navegador no puede exportar GIF directamente. Exporta PNG/JPG o SVG desde este panel."
        );
        return;
      }

      downloadBlob(blob, createArtifactFileName(extension));
    } catch (error) {
      console.error("MARTWIN_EXPORT_FAILURE:", error);
      window.alert(
        "No pude exportar la imagen desde el navegador. Proba abrir la vista previa y usar imprimir/guardar."
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const exportPdf = () => {
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) return;

    previewWindow.document.open();
    previewWindow.document.write(previewHtml);
    previewWindow.document.close();
    previewWindow.focus();

    window.setTimeout(() => {
      previewWindow.print();
    }, 300);
  };

  const exportWord = () => {
    const wordHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MarTwin Artifact</title>
</head>
<body>
  ${previewHtml}
</body>
</html>`;

    downloadBlob(
      new Blob([wordHtml], { type: "application/msword;charset=utf-8" }),
      createArtifactFileName("doc")
    );
  };

  const exportCsv = () => {
    const csv = buildCsv(previewHtml);

    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      createArtifactFileName("csv")
    );
  };

  const exportXls = () => {
    const xlsHtml = buildXlsHtml(previewHtml);

    downloadBlob(
      new Blob([xlsHtml], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      createArtifactFileName("xls")
    );
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

        <div className="flex flex-wrap justify-end gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#e50051] px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
            >
              <FileImage size={13} />
              Abrir
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={exportHtml}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              <Download size={13} />
              HTML
            </button>

            <button
              type="button"
              onClick={exportSvg}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              SVG
            </button>

            <button
              type="button"
              onClick={() => exportRaster("png", "image/png")}
              disabled={Boolean(exportingFormat)}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50"
            >
              {exportingFormat === "png" ? "..." : "PNG"}
            </button>

            <button
              type="button"
              onClick={() => exportRaster("jpg", "image/jpeg")}
              disabled={Boolean(exportingFormat)}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50"
            >
              {exportingFormat === "jpg" ? "..." : "JPG"}
            </button>

            <button
              type="button"
              onClick={() => exportRaster("gif", "image/gif")}
              disabled={Boolean(exportingFormat)}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50"
            >
              {exportingFormat === "gif" ? "..." : "GIF"}
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              <Printer size={13} />
              PDF
            </button>

            <button
              type="button"
              onClick={exportWord}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              Word
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={exportCsv}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={exportXls}
              className="h-8 rounded-xl px-3 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-white/15 active:scale-95"
            >
              XLS
            </button>
          </div>
        </div>
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
  const activeRequestRef = useRef<AbortController | null>(null);

  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [docsSquadGeneratingId, setDocsSquadGeneratingId] = useState<
    string | null
  >(null);

  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileTaskMode, setFileTaskMode] = useState<FileTaskMode>("analysis");
  const [docsTitleModalMessage, setDocsTitleModalMessage] =
    useState<ChatMessage | null>(null);
  const [docsTitleInput, setDocsTitleInput] = useState("");

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
        console.warn("[MarTwin_LoadFiles_Debug] No valid files selected");
        return;
      }

      const nextFiles = await Promise.all(validFiles.map(fileToDataUrl));

      setUploadedFiles(nextFiles);

      if (!input.trim()) {
        setInput(getDefaultFilePrompt(fileTaskMode));
      }

      console.log("[MarTwin_LoadFiles_Debug]", {
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
        console.log("[MarTwin_Paste_Debug] No valid file found in clipboard", {
          files: filesFromClipboard.length,
          items: event.clipboardData.items.length,
          itemTypes: Array.from(event.clipboardData.items).map(
            (item) => item.type
          ),
        });

        return;
      }

      event.preventDefault();

      console.log("[MarTwin_Paste_Debug] Valid file found", {
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

  const handleStopChat = useCallback(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setIsLoading(false);
  }, []);

  const handleDocsSquadDownload = useCallback(
    async (message: ChatMessage, selectedTitle: string) => {
      const rawContent = message.content.trim();
      const plainContent = stripMarkdownForDocx(message.content);

      if (!rawContent) {
        window.alert("Todavia no hay contenido suficiente para generar el documento.");
        return;
      }

      const reportTitle = normalizeReportDisplayTitle(selectedTitle);

      if (!reportTitle.trim()) {
        window.alert("El título del informe no puede estar vacío.");
        return;
      }

      const fileName = createDocsSquadFileNameFromTitle(reportTitle);
      const reportName = fileName.replace(/\.docx$/i, "");

      const docsMetadata = buildDocsSquadMetadata(
        message.content,
        message.docsSquadSource,
        reportTitle
      );

      const driveWindow = window.open("", "_blank");

      if (driveWindow) {
        const safeReportTitle = escapeHtml(reportTitle);
        const safeFileName = escapeHtml(fileName);

        driveWindow.document.write(`
          <!DOCTYPE html>
          <html lang="es">
            <head>
              <meta charset="utf-8" />
              <title>Generando documento...</title>
              <style>
                body {
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #0f0a24;
                  color: #46f2c8;
                  font-family: Arial, sans-serif;
                }

                .box {
                  text-align: center;
                  max-width: 680px;
                  padding: 32px;
                  border: 1px solid rgba(70, 242, 200, 0.45);
                  border-radius: 24px;
                  background: rgba(30, 18, 72, 0.7);
                }

                h1 {
                  margin: 0 0 12px;
                  font-size: 20px;
                  font-weight: 400;
                }

                p {
                  margin: 0 0 10px;
                  color: #ffffff;
                  opacity: 0.75;
                  font-size: 14px;
                }

                strong {
                  display: block;
                  margin-top: 16px;
                  color: #ffffff;
                  font-size: 18px;
                  font-weight: 700;
                  line-height: 1.4;
                }

                code {
                  display: block;
                  margin-top: 14px;
                  color: #46f2c8;
                  word-break: break-word;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="box">
                <h1>Generando documento...</h1>
                <p>MarTwin está creando el archivo en Google Drive.</p>
                <strong>${safeReportTitle}</strong>
                <code>${safeFileName}</code>
              </div>
            </body>
          </html>
        `);
        driveWindow.document.close();
      }

      setDocsSquadGeneratingId(message.id);

      try {
        const response = await fetch("/api/google/docs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre_reporte: reportName,
            titulo_reporte: reportTitle,
            consulta_original: message.docsSquadSource || reportTitle,
            consulta_actual_y_cambios: docsMetadata.changes,
            descripcion_funcional:
              docsMetadata.description || plainContent.slice(0, 3500),
            detalles_funcionales: rawContent,
            campo_tipo_lista: docsMetadata.references,
          }),
        });

        const result = (await response.json().catch(() => null)) as {
          success?: boolean;
          url?: string;
          folderUrl?: string;
          error?: string;
          details?: unknown;
        } | null;

        console.log("GOOGLE_DOCS_RESULT:", result);

        if (!response.ok || !result?.success || (!result.url && !result.folderUrl)) {
          console.error("GOOGLE_DOCS_RESPONSE_FAILURE:", result);

          throw new Error(
            result?.error || "No se pudo generar el documento en Google Docs."
          );
        }

        const openTargetUrl = result.url || result.folderUrl;

        if (!openTargetUrl) {
          throw new Error("Google no devolvió URL para abrir.");
        }

        if (driveWindow && !driveWindow.closed) {
          const safeOpenTargetUrl = escapeHtml(openTargetUrl);
          const scriptOpenTargetUrl = escapeForInlineScript(openTargetUrl);
          const safeReportTitle = escapeHtml(reportTitle);
          const safeFileName = escapeHtml(fileName);

          driveWindow.document.open();
          driveWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
              <head>
                <meta charset="utf-8" />
                <meta http-equiv="refresh" content="1;url=${safeOpenTargetUrl}" />
                <title>Documento creado</title>
                <style>
                  body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0f0a24;
                    color: #46f2c8;
                    font-family: Arial, sans-serif;
                  }

                  .box {
                    text-align: center;
                    max-width: 760px;
                    padding: 32px;
                    border: 1px solid rgba(70, 242, 200, 0.45);
                    border-radius: 24px;
                    background: rgba(30, 18, 72, 0.7);
                  }

                  h1 {
                    margin: 0 0 12px;
                    font-size: 20px;
                    font-weight: 400;
                  }

                  p {
                    margin: 0 0 10px;
                    color: #ffffff;
                    opacity: 0.75;
                    font-size: 14px;
                  }

                  strong {
                    display: block;
                    margin-top: 16px;
                    color: #ffffff;
                    font-size: 18px;
                    font-weight: 700;
                    line-height: 1.4;
                  }

                  code {
                    display: block;
                    margin-top: 14px;
                    color: #46f2c8;
                    word-break: break-word;
                    font-size: 12px;
                  }

                  a {
                    display: inline-flex;
                    margin-top: 22px;
                    border-radius: 16px;
                    background: #46f2c8;
                    color: #000000;
                    padding: 12px 18px;
                    text-decoration: none;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.18em;
                  }
                </style>
              </head>

              <body>
                <div class="box">
                  <h1>Documento creado</h1>
                  <p>Redirigiendo a Google Docs...</p>
                  <strong>${safeReportTitle}</strong>
                  <code>${safeFileName}</code>
                  <a href="${safeOpenTargetUrl}" target="_self" rel="noreferrer">
                    Abrir documento
                  </a>
                </div>

                <script>
                  window.setTimeout(function () {
                    window.location.href = ${scriptOpenTargetUrl};
                  }, 300);
                </script>
              </body>
            </html>
          `);
          driveWindow.document.close();

          window.setTimeout(() => {
            try {
              driveWindow.location.href = openTargetUrl;
            } catch (navigationError) {
              console.error(
                "GOOGLE_DOCS_WINDOW_NAVIGATION_FAILURE:",
                navigationError
              );
            }
          }, 600);
        } else {
          const fallbackWindow = window.open(
            openTargetUrl,
            "_blank",
            "noopener,noreferrer"
          );

          if (!fallbackWindow) {
            window.alert(
              `Documento creado, pero el navegador bloqueó la apertura automática.\n\nAbrilo manualmente desde:\n${openTargetUrl}`
            );
          }
        }
      } catch (error: unknown) {
        console.error("GOOGLE_DOCS_DOWNLOAD_FAILURE:", error);

        if (driveWindow && !driveWindow.closed) {
          driveWindow.document.open();
          driveWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
              <head>
                <meta charset="utf-8" />
                <title>Error al generar documento</title>
                <style>
                  body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0f0a24;
                    color: white;
                    font-family: Arial, sans-serif;
                  }

                  .box {
                    max-width: 680px;
                    padding: 32px;
                    border: 1px solid rgba(229, 0, 81, 0.55);
                    border-radius: 24px;
                    background: rgba(30, 18, 72, 0.7);
                    text-align: center;
                  }

                  h1 {
                    color: #e50051;
                    font-size: 20px;
                    font-weight: 700;
                  }

                  p {
                    color: #ffffff;
                    opacity: 0.8;
                    font-size: 14px;
                    line-height: 1.5;
                  }
                </style>
              </head>
              <body>
                <div class="box">
                  <h1>No se pudo abrir el documento</h1>
                  <p>Revisá la consola de Next para ver el detalle del error.</p>
                </div>
              </body>
            </html>
          `);
          driveWindow.document.close();
        }

        const messageText =
          error instanceof Error
            ? error.message
            : "No pude crear o abrir el documento en Google Docs.";

        window.alert(messageText);
      } finally {
        setDocsSquadGeneratingId(null);
      }
    },
    []
  );

  const handleChatSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedInput = input.trim();
      const currentUploadedFiles = [...uploadedFiles];
      const shouldShowDocsSquad = shouldEnableDocsSquad(trimmedInput);
      const shouldForceVisualMode =
        /\b(mock|mockup|mockea|mockear|mockeando|preview|vista previa|visualiza|visualizar|render|renderiza|renderizar)\b/i.test(
          trimmedInput
        );
      const effectiveFileTaskMode: FileTaskMode = shouldForceVisualMode
        ? "visual"
        : fileTaskMode;

      if (!trimmedInput && !currentUploadedFiles.length) {
        return;
      }

      activeRequestRef.current?.abort();

      const requestController = new AbortController();
      activeRequestRef.current = requestController;

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
        docsSquadEnabled: shouldShowDocsSquad,
        docsSquadSource: trimmedInput,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        assistantMessage,
      ]);

      setInput("");
      setIsLoading(true);

      console.log("[MarTwin_Submit_Debug]", {
        inputLength: userMessage.content.length,
        uploadedFiles: currentUploadedFiles.length,
        names: currentUploadedFiles.map((file) => file.name),
        types: currentUploadedFiles.map((file) => file.type),
        fileTaskMode: effectiveFileTaskMode,
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
            fileTaskMode: effectiveFileTaskMode,
          }),
          signal: requestController.signal,
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
        if (error instanceof DOMException && error.name === "AbortError") {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content:
                      message.docsSquadEnabled && message.content.trim()
                        ? "Consulta detenida por el usuario."
                        : message.content,
                    attachments: currentUploadedFiles,
                  }
                : message
            )
          );

          return;
        }

        console.error("MARTWIN_FRONT_CHAT_FAILURE:", error);

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
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
        }

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
              MarTwin{" "}
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
                    <>
                      {message.docsSquadEnabled && message.content.trim() && (
                        <div className="mt-5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const suggestedTitle = createDocsSquadTitle(
                                message.content,
                                message.docsSquadSource
                              );

                              setDocsTitleInput(suggestedTitle);
                              setDocsTitleModalMessage(message);
                            }}
                            disabled={docsSquadGeneratingId === message.id}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#46f2c8]/50 bg-[#46f2c8] px-4 text-[10px] font-normal uppercase tracking-widest text-[black] shadow-lg shadow-[#46f2c8]/20 transition-all hover:bg-black active:scale-95 disabled:cursor-wait disabled:opacity-70"
                            title="Abrir informe con template Squad en Google Docs"
                          >
                            <FileText size={14} />
                            {docsSquadGeneratingId === message.id
                              ? "Abriendo..."
                              : "Google Docs"}
                          </button>
                        </div>
                      )}

                      <HtmlPreview
                        content={message.content}
                        assets={message.attachments || []}
                      />
                    </>
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

            {isLoading && (
              <button
                type="button"
                onClick={handleStopChat}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e50051] text-white shadow-md shadow-[#e50051]/15 transition-all hover:opacity-90 active:scale-95"
                title="Detener respuesta"
              >
                <X size={15} />
              </button>
            )}

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
            MarTwin IT Development Core // Secure Workspace
          </p>
        </form>
      </footer>

      {docsTitleModalMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#1e1248] p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#46f2c8]">
                Google Docs Squad
              </p>

              <h3 className="mt-2 text-xl font-normal text-white">
                Título del informe
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Revisá o corregí el título antes de crear el documento en Google Drive.
              </p>
            </div>

            <input
              autoFocus
              value={docsTitleInput}
              onChange={(event) => setDocsTitleInput(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-[#46f2c8] focus:ring-4 focus:ring-[#46f2c8]/10"
              placeholder="Ej: Informe de configuración de EmailPdf"
            />

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Vista previa
              </p>

              <p className="mt-2 text-sm font-bold text-white">
                {normalizeReportDisplayTitle(docsTitleInput)}
              </p>

              <p className="mt-1 text-[11px] text-[#46f2c8]">
                {createDocsSquadFileNameFromTitle(docsTitleInput)}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDocsTitleModalMessage(null);
                  setDocsTitleInput("");
                }}
                className="rounded-2xl border border-white/10 px-5 py-3 text-[10px] uppercase tracking-widest text-white/70 transition-all hover:bg-white/10"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentMessage = docsTitleModalMessage;
                  const currentTitle = docsTitleInput;

                  setDocsTitleModalMessage(null);
                  setDocsTitleInput("");

                  void handleDocsSquadDownload(currentMessage, currentTitle);
                }}
                className="rounded-2xl bg-[#46f2c8] px-5 py-3 text-[10px] uppercase tracking-widest text-black transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!docsTitleInput.trim()}
              >
                Crear en Drive
              </button>
            </div>
          </div>
        </div>
      )}

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