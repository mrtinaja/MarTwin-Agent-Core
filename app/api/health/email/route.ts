export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type EmailHealthStatus = "ok" | "warning" | "error";

type EmailHealthCheck = {
  key: string;
  status: EmailHealthStatus;
  message: string;
  details?: unknown;
};

type EmailHealthResult = {
  success: boolean;
  status: EmailHealthStatus;
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  checks: EmailHealthCheck[];
};

type EmailCountResponse = {
  total?: number;
  unread?: number;
  error?: unknown;
  details?: unknown;
  [key: string]: unknown;
};

function getWorstStatus(checks: EmailHealthCheck[]): EmailHealthStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}

function buildSummary(checks: EmailHealthCheck[]) {
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

function getBaseUrl(request: Request) {
  const url = new URL(request.url);

  return `${url.protocol}//${url.host}`;
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as EmailCountResponse;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildCookieHeader(request: Request) {
  const cookie = request.headers.get("cookie");

  if (!cookie) {
    return undefined;
  }

  return {
    cookie,
  };
}

function hasEmailAuthError(data: EmailCountResponse | null) {
  const errorText = String(data?.error || data?.details || "").toLowerCase();

  return (
    errorText.includes("invalid authentication credentials") ||
    errorText.includes("expected oauth 2 access token") ||
    errorText.includes("unauthorized") ||
    errorText.includes("invalid_grant") ||
    errorText.includes("invalid token") ||
    errorText.includes("insufficient authentication") ||
    errorText.includes("insufficient permission") ||
    errorText.includes("forbidden")
  );
}

function hasPayloadError(data: EmailCountResponse | null) {
  return Boolean(data?.error || data?.details);
}

export async function GET(request: Request) {
  const checks: EmailHealthCheck[] = [];

  try {
    const baseUrl = getBaseUrl(request);
    const cookieHeaders = buildCookieHeader(request);

    const response = await fetch(`${baseUrl}/api/email/count`, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(cookieHeaders || {}),
      },
    });

    const data = await readJsonSafely(response);

    if (response.status === 401) {
      checks.push({
        key: "email_session",
        status: "warning",
        message:
          "El endpoint de email respondió 401. Puede faltar sesión activa o no se reenviaron cookies al healthcheck.",
        details: data,
      });
    } else if (!response.ok) {
      checks.push({
        key: "email_count",
        status: "error",
        message: `El endpoint /api/email/count respondió con HTTP ${response.status}.`,
        details: data,
      });
    } else if (hasEmailAuthError(data)) {
      checks.push({
        key: "email_auth",
        status: "error",
        message:
          "Email respondió HTTP 200, pero Google rechazó las credenciales OAuth. Revisar access token, refresh token o scopes de Gmail.",
        details: data,
      });
    } else if (hasPayloadError(data)) {
      checks.push({
        key: "email_payload",
        status: "error",
        message:
          "Email respondió HTTP 200, pero el payload contiene un error interno.",
        details: data,
      });
    } else if (typeof data?.total !== "number") {
      checks.push({
        key: "email_count",
        status: "warning",
        message:
          "El endpoint /api/email/count respondió, pero no devolvió un total numérico.",
        details: data,
      });
    } else {
      checks.push({
        key: "email_count",
        status: "ok",
        message: "El endpoint /api/email/count respondió correctamente.",
        details: data,
      });
    }

    const status = getWorstStatus(checks);

    const result: EmailHealthResult = {
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
            key: "email_health",
            status: "error",
            message: "No se pudo ejecutar el healthcheck de email.",
            details: getErrorMessage(error),
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