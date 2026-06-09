import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type GoogleHealthStatus = "ok" | "warning" | "error";

type GoogleHealthCheck = {
  key: string;
  status: GoogleHealthStatus;
  message: string;
  details?: unknown;
};

type GoogleHealthResult = {
  success: boolean;
  status: GoogleHealthStatus;
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  checks: GoogleHealthCheck[];
};

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Falta ${key}.`);
  }

  return value;
}

function getWorstStatus(checks: GoogleHealthCheck[]): GoogleHealthStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}

function buildSummary(checks: GoogleHealthCheck[]) {
  return checks.reduce(
    (summary, check) => {
      summary.total += 1;
      summary[check.status] += 1;

      return summary;
    },
    {
      total: 0,
      ok: 0,
      warning: 0,
      error: 0,
    }
  );
}

function buildOAuthClient() {
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = getRequiredEnv("GOOGLE_REDIRECT_URI");
  const refreshToken = getRequiredEnv("GOOGLE_REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  const checks: GoogleHealthCheck[] = [];

  try {
    const folderId = getRequiredEnv("GOOGLE_DRIVE_FOLDER_ID");
    const oauth2Client = buildOAuthClient();

    let canListFolder = false;

    try {
      const accessTokenResponse = await oauth2Client.getAccessToken();

      if (!accessTokenResponse.token) {
        checks.push({
          key: "google_access_token",
          status: "error",
          message:
            "Google no devolvió access token. Revisar GOOGLE_REFRESH_TOKEN.",
        });
      } else {
        checks.push({
          key: "google_access_token",
          status: "ok",
          message: "Google devolvió access token correctamente.",
        });
      }
    } catch (error: unknown) {
      checks.push({
        key: "google_access_token",
        status: "error",
        message:
          "No se pudo obtener access token desde GOOGLE_REFRESH_TOKEN.",
        details: getErrorMessage(error),
      });
    }

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    try {
      const aboutResponse = await drive.about.get({
        fields: "user,storageQuota",
      });

      checks.push({
        key: "drive_about",
        status: "ok",
        message: "Google Drive respondió correctamente.",
        details: {
          user: aboutResponse.data.user?.emailAddress,
          displayName: aboutResponse.data.user?.displayName,
          storageLimit: aboutResponse.data.storageQuota?.limit,
          storageUsage: aboutResponse.data.storageQuota?.usage,
        },
      });
    } catch (error: unknown) {
      checks.push({
        key: "drive_about",
        status: "error",
        message:
          "No se pudo consultar Google Drive. Revisar permisos OAuth/scopes.",
        details: getErrorMessage(error),
      });
    }

    try {
      const listResponse = await drive.files.list({
        pageSize: 5,
        fields: "files(id,name,mimeType,modifiedTime)",
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      canListFolder = true;

      checks.push({
        key: "drive_folder_list",
        status: "ok",
        message: `Se pudo listar la carpeta. Archivos encontrados: ${
          listResponse.data.files?.length || 0
        }.`,
        details: listResponse.data.files || [],
      });
    } catch (error: unknown) {
      checks.push({
        key: "drive_folder_list",
        status: "error",
        message:
          "No se pudo listar GOOGLE_DRIVE_FOLDER_ID. Revisar ID, permisos o scope OAuth.",
        details: getErrorMessage(error),
      });
    }

    try {
      const folderResponse = await drive.files.get({
        fileId: folderId,
        fields: "id,name,mimeType,trashed,webViewLink",
        supportsAllDrives: true,
      });

      const folder = folderResponse.data;

      if (folder.trashed) {
        checks.push({
          key: "drive_folder_metadata",
          status: "error",
          message: "La carpeta configurada está en la papelera.",
          details: folder,
        });
      } else if (folder.mimeType !== "application/vnd.google-apps.folder") {
        checks.push({
          key: "drive_folder_metadata",
          status: "warning",
          message:
            "GOOGLE_DRIVE_FOLDER_ID existe, pero no parece ser una carpeta.",
          details: folder,
        });
      } else {
        checks.push({
          key: "drive_folder_metadata",
          status: "ok",
          message: "La metadata de la carpeta es accesible.",
          details: {
            id: folder.id,
            name: folder.name,
            webViewLink: folder.webViewLink,
          },
        });
      }
    } catch (error: unknown) {
      checks.push({
        key: "drive_folder_metadata",
        status: canListFolder ? "warning" : "error",
        message: canListFolder
          ? "La carpeta se puede usar y listar, pero Google no permite leer su metadata con el scope actual. Esto es esperable con drive.file."
          : "No se pudo acceder a la metadata de GOOGLE_DRIVE_FOLDER_ID. Revisar ID o permisos.",
        details: getErrorMessage(error),
      });
    }

    const status = getWorstStatus(checks);

    const result: GoogleHealthResult = {
      success: status !== "error",
      status,
      summary: buildSummary(checks),
      checks,
    };

    return Response.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    return Response.json(
      {
        success: false,
        status: "error",
        summary: {
          total: 1,
          ok: 0,
          warning: 0,
          error: 1,
        },
        checks: [
          {
            key: "google_health",
            status: "error",
            message,
          },
        ],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}