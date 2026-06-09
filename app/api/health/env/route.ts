import { getEnvHealth } from "@/lib/health/envHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const health = getEnvHealth();

    return Response.json(health, {
      status: health.success ? 200 : 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    return Response.json(
      {
        success: false,
        status: "error",
        error: "ENV_HEALTH_CHECK_FAILED",
        details: message,
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