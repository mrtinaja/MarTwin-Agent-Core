export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { google } from "googleapis";
import { NextResponse } from "next/server";

type DriveFileItem = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
};

type DriveIndexResult = {
  kind: "drive#index";
  total: number;
  titles: string;
  source: "live_network" | "cache";
};

type DriveListResult = {
  total: number;
  files: DriveFileItem[];
  source: "live_network" | "cache";
  folderUrl?: string;
};

type DriveCacheValue = {
  data: DriveIndexResult | DriveListResult;
  timestamp: number;
};

const driveCache = new Map<string, DriveCacheValue>();
const CACHE_TTL = 1000 * 60 * 5;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error inesperado.";
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getGoogleDriveFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
}

function getGoogleDriveFolderUrl() {
  const folderId = getGoogleDriveFolderId();

  if (!folderId) {
    return undefined;
  }

  return `https://drive.google.com/drive/folders/${folderId}`;
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

function buildDriveQuery(query: string) {
  const filters: string[] = ["trashed = false"];

  if (query.trim()) {
    filters.push(`name contains '${escapeDriveQueryValue(query.trim())}'`);
  }

  return filters.join(" and ");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const mode = searchParams.get("mode");
    const isIndex = mode === "index";

    const cacheKey = `all-accessible-${query}-${mode || "list"}`;
    const cached = driveCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("⚡ [DRIVE] Servido desde caché OAuth.");

      return NextResponse.json({
        ...cached.data,
        source: "cache",
      });
    }

    const drive = getOAuthDriveClient();
    const qFilter = buildDriveQuery(query);

    const response = await drive.files.list({
      pageSize: isIndex ? 1000 : 100,
      fields: isIndex
        ? "files(name)"
        : "files(id,name,mimeType,modifiedTime,webViewLink)",
      q: qFilter,
      spaces: "drive",
      orderBy: "modifiedTime desc",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = (response.data.files || []) as DriveFileItem[];

    const result: DriveIndexResult | DriveListResult = isIndex
      ? {
          kind: "drive#index",
          total: files.length,
          titles: files
            .map((file) => file.name || "")
            .filter(Boolean)
            .join(" | "),
          source: "live_network",
        }
      : {
          total: files.length,
          files,
          source: "live_network",
          folderUrl: getGoogleDriveFolderUrl(),
        };

    driveCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    console.error("❌ DRIVE_CRITICAL_ERROR:", message);

    return NextResponse.json(
      {
        error: "Protocolo de red interrumpido",
        details: message,
      },
      { status: 500 }
    );
  }
}