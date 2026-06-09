import { getEnvHealth } from "@/lib/health/envHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type HealthStatus = "ok" | "warning" | "error";

type HealthSection = {
  key: string;
  status: HealthStatus;
  success: boolean;
  summary?: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  url: string;
  message: string;
};

type HealthResult = {
  success: boolean;
  status: HealthStatus;
  generatedAt: string;
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  sections: HealthSection[];
};

function getBaseUrl(request: Request) {
  const url = new URL(request.url);

  return `${url.protocol}//${url.host}`;
}

function getWorstStatus(sections: HealthSection[]): HealthStatus {
  if (sections.some((section) => section.status === "error")) {
    return "error";
  }

  if (sections.some((section) => section.status === "warning")) {
    return "warning";
  }

  return "ok";
}

function buildSummary(sections: HealthSection[]) {
  return sections.reduce(
    (summary, section) => {
      summary.total += 1;
      summary[section.status] += 1;

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

async function fetchHealthSection(
  baseUrl: string,
  key: string,
  path: string,
  message: string
): Promise<HealthSection> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    const status = (data?.status || "error") as HealthStatus;
    const success = Boolean(data?.success);

    return {
      key,
      status,
      success,
      summary: data?.summary,
      url: path,
      message,
    };
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);

    return {
      key,
      status: "error",
      success: false,
      url: path,
      message: `${message}. Falló la consulta interna: ${details}`,
    };
  }
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);

  const envHealth = getEnvHealth();

  const sections: HealthSection[] = [
    {
      key: "env",
      status: envHealth.status,
      success: envHealth.success,
      summary: envHealth.summary,
      url: "/api/health/env",
      message: "Variables de entorno y configuración base.",
    },
  ];

  const [googleHealth, modelsHealth] = await Promise.all([
    fetchHealthSection(
      baseUrl,
      "google",
      "/api/health/google",
      "Google OAuth, Drive y carpeta configurada."
    ),
    fetchHealthSection(
      baseUrl,
      "models",
      "/api/health/models",
      "Proveedores IA, modelos y límites de tokens."
    ),
  ]);

  sections.push(googleHealth, modelsHealth);

  const status = getWorstStatus(sections);

  const result: HealthResult = {
    success: status !== "error",
    status,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(sections),
    sections,
  };

  return Response.json(result, {
    status: result.success ? 200 : 500,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}