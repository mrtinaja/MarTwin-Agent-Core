import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DETAILS_MARKER = "{detalles_funcionales}";

type GenerateGoogleDocRequest = {
  nombre_reporte?: string;
  consulta_original?: string;
  consulta_actual_y_cambios?: string;
  descripcion_funcional?: string;
  detalles_funcionales?: string;
  campo_tipo_lista?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Error inesperado.";
}

function getGoogleErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const currentError = error as {
    response?: {
      data?: unknown;
      status?: number;
      statusText?: string;
    };
    errors?: unknown;
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };

  return {
    message: currentError.message,
    code: currentError.code,
    status: currentError.status,
    errors: currentError.errors,
    responseStatus: currentError.response?.status,
    responseStatusText: currentError.response?.statusText,
    responseData: currentError.response?.data,
  };
}

function escapeXml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFileName(value: string) {
  return String(value || "Informe_Squad")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function paragraphXml(text: string) {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function markdownToSimpleWordXml(markdown: string) {
  return String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => paragraphXml(line.trim()))
    .join("");
}

function injectRichDetailsXml(zip: PizZip, details: string) {
  const documentFile = zip.file("word/document.xml");

  if (!documentFile) {
    throw new Error("No se encontró word/document.xml dentro del template DOCX.");
  }

  const richXml = markdownToSimpleWordXml(details);
  const documentXml = documentFile.asText();

  const markerParagraph = new RegExp(
    `<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*?${DETAILS_MARKER.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
    "g"
  );

  const replacedXml = documentXml.replace(markerParagraph, richXml);

  if (replacedXml === documentXml) {
    throw new Error(`No se encontró el marcador ${DETAILS_MARKER} en el template.`);
  }

  zip.file("word/document.xml", replacedXml);
}

function generateDocxBuffer(data: GenerateGoogleDocRequest) {
  const templatePath = path.join(
    process.cwd(),
    "templates",
    "docxtemplater.docx"
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`No existe el template en: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  injectRichDetailsXml(zip, data.detalles_funcionales || "");

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    ...data,
    detalles_funcionales: "",
  });

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

function bufferToStream(buffer: Buffer) {
  const stream = new PassThrough();
  stream.end(buffer);

  return stream;
}

function getOAuthDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI o GOOGLE_REFRESH_TOKEN."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({
    version: "v3",
    auth: oauth2Client,
  });
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as GenerateGoogleDocRequest;
    const drive = getOAuthDriveClient();

    const buffer = generateDocxBuffer(data);
    const reportName = sanitizeFileName(data.nombre_reporte || "Informe_Squad");
    const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

    const createdFile = await drive.files.create({
      requestBody: {
        name: `${reportName}.docx`,
        mimeType: "application/vnd.google-apps.document",
        parents: googleDriveFolderId ? [googleDriveFolderId] : undefined,
      },
      media: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body: bufferToStream(buffer),
      },
      fields: "id,name,webViewLink",
    });

    const fileId = createdFile.data.id;

    if (!fileId) {
      throw new Error("Google Drive no devolvió ID del documento.");
    }

    const documentUrl =
      createdFile.data.webViewLink ||
      `https://docs.google.com/document/d/${fileId}/edit`;

    const folderUrl = googleDriveFolderId
      ? `https://drive.google.com/drive/folders/${googleDriveFolderId}`
      : undefined;

    return NextResponse.json({
      success: true,
      id: fileId,
      name: createdFile.data.name,
      url: documentUrl,
      folderUrl,
    });
  } catch (error: unknown) {
    const details = getGoogleErrorDetails(error);

    console.error("GOOGLE_DOCS_GENERATION_ERROR:", {
      error: getErrorMessage(error),
      details,
    });

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
        details,
      },
      { status: 500 }
    );
  }
}