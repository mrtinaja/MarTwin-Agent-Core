export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModelHealthStatus = "ok" | "warning" | "error";

type ModelHealthCheck = {
  key: string;
  status: ModelHealthStatus;
  message: string;
  details?: unknown;
};

type ModelHealthResult = {
  success: boolean;
  status: ModelHealthStatus;
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  checks: ModelHealthCheck[];
};

function getEnvValue(key: string) {
  return process.env[key]?.trim();
}

function getRequiredEnv(key: string) {
  const value = getEnvValue(key);

  if (!value) {
    throw new Error(`Falta ${key}.`);
  }

  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getWorstStatus(checks: ModelHealthCheck[]): ModelHealthStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}

function buildSummary(checks: ModelHealthCheck[]) {
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

function parseModelList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 20000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isQuotaOrBillingError(status: number, message: unknown) {
  const normalizedMessage = String(message || "").toLowerCase();

  return (
    status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("insufficient_quota")
  );
}

async function checkOpenAI(): Promise<ModelHealthCheck> {
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const model = getRequiredEnv("OPENAI_CHAT_MODEL");

  try {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Healthcheck técnico. Responder solo OK.",
            },
            {
              role: "user",
              content: "OK",
            },
          ],
          temperature: 0,
          max_tokens: 16,
        }),
      }
    );

    const data = await readJsonSafely(response);
    const errorMessage = data?.error?.message || data;

    if (!response.ok) {
      if (isQuotaOrBillingError(response.status, errorMessage)) {
        return {
          key: "openai",
          status: "warning",
          message:
            "OpenAI respondió, pero la cuenta no tiene cuota disponible o requiere revisar billing. El sistema puede seguir funcionando por fallback.",
          details: {
            model,
            httpStatus: response.status,
            error: errorMessage,
          },
        };
      }

      return {
        key: "openai",
        status: "error",
        message: `OpenAI respondió con error HTTP ${response.status}.`,
        details: {
          model,
          error: errorMessage,
        },
      };
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return {
        key: "openai",
        status: "warning",
        message:
          "OpenAI respondió, pero no devolvió contenido utilizable en el healthcheck.",
        details: {
          model,
          response: data,
        },
      };
    }

    return {
      key: "openai",
      status: "ok",
      message: "OpenAI respondió correctamente.",
      details: {
        model,
        content,
      },
    };
  } catch (error: unknown) {
    return {
      key: "openai",
      status: "error",
      message: "No se pudo consultar OpenAI.",
      details: {
        model,
        error: getErrorMessage(error),
      },
    };
  }
}

async function checkGemini(): Promise<ModelHealthCheck> {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");
  const model = getRequiredEnv("GEMINI_MODEL");

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Healthcheck técnico. Respondé exactamente OK.",
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 64,
          },
        }),
      }
    );

    const data = await readJsonSafely(response);

    if (!response.ok) {
      return {
        key: "gemini",
        status: "error",
        message: `Gemini respondió con error HTTP ${response.status}.`,
        details: {
          model,
          error: data?.error?.message || data,
        },
      };
    }

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data?.candidates?.[0]?.finishReason;

    if (!content) {
      return {
        key: "gemini",
        status: "warning",
        message:
          "Gemini respondió, pero no devolvió contenido utilizable en el healthcheck.",
        details: {
          model,
          finishReason,
          response: data,
        },
      };
    }

    return {
      key: "gemini",
      status: "ok",
      message: "Gemini respondió correctamente.",
      details: {
        model,
        content,
        finishReason,
      },
    };
  } catch (error: unknown) {
    return {
      key: "gemini",
      status: "error",
      message: "No se pudo consultar Gemini.",
      details: {
        model,
        error: getErrorMessage(error),
      },
    };
  }
}

async function checkOpenRouter(): Promise<ModelHealthCheck> {
  const apiKey = getRequiredEnv("OPENROUTER_API_KEY");
  const model = getRequiredEnv("OPENROUTER_MODEL");
  const siteUrl = getEnvValue("OPENROUTER_SITE_URL") || "http://localhost:3000";
  const appName = getEnvValue("OPENROUTER_APP_NAME") || "MarTwin";

  try {
    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": appName,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Healthcheck técnico. Responder solo OK.",
            },
            {
              role: "user",
              content: "OK",
            },
          ],
          temperature: 0,
          max_tokens: 16,
        }),
      }
    );

    const data = await readJsonSafely(response);

    if (!response.ok) {
      return {
        key: "openrouter",
        status: "error",
        message: `OpenRouter respondió con error HTTP ${response.status}.`,
        details: {
          model,
          error: data?.error?.message || data,
        },
      };
    }

    const content = data?.choices?.[0]?.message?.content;
    const finishReason = data?.choices?.[0]?.finish_reason;

    if (!content) {
      return {
        key: "openrouter",
        status: "warning",
        message:
          "OpenRouter respondió, pero no devolvió contenido utilizable en el healthcheck.",
        details: {
          model,
          finishReason,
          response: data,
        },
      };
    }

    return {
      key: "openrouter",
      status: "ok",
      message: "OpenRouter respondió correctamente.",
      details: {
        model,
        content,
        finishReason,
      },
    };
  } catch (error: unknown) {
    return {
      key: "openrouter",
      status: "error",
      message: "No se pudo consultar OpenRouter.",
      details: {
        model,
        error: getErrorMessage(error),
      },
    };
  }
}

function checkTokenLimits(): ModelHealthCheck {
  const textTokens = Number(getEnvValue("OPENAI_TEXT_MAX_OUTPUT_TOKENS"));
  const visualTokens = Number(getEnvValue("OPENAI_VISUAL_MAX_OUTPUT_TOKENS"));

  if (!Number.isFinite(textTokens) || textTokens <= 0) {
    return {
      key: "token_limits",
      status: "error",
      message: "OPENAI_TEXT_MAX_OUTPUT_TOKENS debe ser un número positivo.",
      details: {
        OPENAI_TEXT_MAX_OUTPUT_TOKENS: getEnvValue(
          "OPENAI_TEXT_MAX_OUTPUT_TOKENS"
        ),
      },
    };
  }

  if (!Number.isFinite(visualTokens) || visualTokens <= 0) {
    return {
      key: "token_limits",
      status: "error",
      message: "OPENAI_VISUAL_MAX_OUTPUT_TOKENS debe ser un número positivo.",
      details: {
        OPENAI_VISUAL_MAX_OUTPUT_TOKENS: getEnvValue(
          "OPENAI_VISUAL_MAX_OUTPUT_TOKENS"
        ),
      },
    };
  }

  if (textTokens < 3000 || visualTokens < 3000) {
    return {
      key: "token_limits",
      status: "warning",
      message:
        "Los límites de tokens parecen bajos. Algunas respuestas largas podrían cortarse.",
      details: {
        OPENAI_TEXT_MAX_OUTPUT_TOKENS: textTokens,
        OPENAI_VISUAL_MAX_OUTPUT_TOKENS: visualTokens,
      },
    };
  }

  return {
    key: "token_limits",
    status: "ok",
    message: "Los límites de tokens están configurados correctamente.",
    details: {
      OPENAI_TEXT_MAX_OUTPUT_TOKENS: textTokens,
      OPENAI_VISUAL_MAX_OUTPUT_TOKENS: visualTokens,
    },
  };
}

function checkConfiguredModelLists(): ModelHealthCheck {
  const generalModels = parseModelList(getEnvValue("OPENROUTER_MODEL_LIST"));
  const textModels = parseModelList(getEnvValue("OPENROUTER_TEXT_MODEL_LIST"));
  const visionModels = parseModelList(
    getEnvValue("OPENROUTER_VISION_MODEL_LIST")
  );

  const details = {
    OPENROUTER_MODEL_LIST: generalModels,
    OPENROUTER_TEXT_MODEL_LIST: textModels,
    OPENROUTER_VISION_MODEL_LIST: visionModels,
  };

  if (!generalModels.length && !textModels.length && !visionModels.length) {
    return {
      key: "model_lists",
      status: "warning",
      message:
        "No hay listas de modelos configuradas. El sistema dependerá de modelos únicos o fallbacks internos.",
      details,
    };
  }

  if (!textModels.length || !visionModels.length) {
    return {
      key: "model_lists",
      status: "warning",
      message:
        "Hay listas de modelos incompletas. Conviene separar modelos de texto y visión.",
      details,
    };
  }

  return {
    key: "model_lists",
    status: "ok",
    message: "Las listas de modelos están configuradas correctamente.",
    details,
  };
}

function hasAtLeastOneWorkingProvider(checks: ModelHealthCheck[]) {
  return checks.some(
    (check) =>
      ["openai", "gemini", "openrouter"].includes(check.key) &&
      check.status === "ok"
  );
}

function calculateOperationalStatus(
  checks: ModelHealthCheck[]
): ModelHealthStatus {
  const hasWorkingProvider = hasAtLeastOneWorkingProvider(checks);

  const criticalErrors = checks.filter((check) => {
    if (["openai", "gemini", "openrouter"].includes(check.key)) {
      return !hasWorkingProvider && check.status === "error";
    }

    return check.status === "error";
  });

  if (criticalErrors.length > 0) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  if (checks.some((check) => check.status === "error")) {
    return "warning";
  }

  return "ok";
}

export async function GET() {
  const checks: ModelHealthCheck[] = [];

  try {
    checks.push(checkTokenLimits());
    checks.push(checkConfiguredModelLists());

    const providerChecks = await Promise.allSettled([
      checkOpenAI(),
      checkGemini(),
      checkOpenRouter(),
    ]);

    for (const providerCheck of providerChecks) {
      if (providerCheck.status === "fulfilled") {
        checks.push(providerCheck.value);
      } else {
        checks.push({
          key: "provider_check",
          status: "error",
          message: "Falló un healthcheck de proveedor IA.",
          details: getErrorMessage(providerCheck.reason),
        });
      }
    }

    const status = calculateOperationalStatus(checks);

    const result: ModelHealthResult = {
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
            key: "models_health",
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