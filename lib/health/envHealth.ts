type EnvCheckStatus = "ok" | "warning" | "error";

type EnvCheck = {
  key: string;
  status: EnvCheckStatus;
  message: string;
  valuePreview?: string;
};

type EnvHealthResult = {
  success: boolean;
  status: EnvCheckStatus;
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  checks: EnvCheck[];
};

function maskSecret(value: string | undefined) {
  if (!value) {
    return "";
  }

  const cleanValue = value.trim();

  if (cleanValue.length <= 10) {
    return "***";
  }

  return `${cleanValue.slice(0, 6)}...${cleanValue.slice(-4)}`;
}

function getEnvValue(key: string) {
  return process.env[key]?.trim();
}

function checkRequiredEnv(key: string, label?: string): EnvCheck {
  const value = getEnvValue(key);

  if (!value) {
    return {
      key,
      status: "error",
      message: `${label || key} no está configurado.`,
    };
  }

  return {
    key,
    status: "ok",
    message: `${label || key} configurado correctamente.`,
    valuePreview: maskSecret(value),
  };
}

function checkUrlEnv(key: string, expectedPrefix?: string): EnvCheck {
  const value = getEnvValue(key);

  if (!value) {
    return {
      key,
      status: "error",
      message: `${key} no está configurado.`,
    };
  }

  try {
    const url = new URL(value);

    if (expectedPrefix && !value.startsWith(expectedPrefix)) {
      return {
        key,
        status: "warning",
        message: `${key} existe, pero no empieza con ${expectedPrefix}. Revisar si el puerto o protocolo coinciden.`,
        valuePreview: value,
      };
    }

    return {
      key,
      status: "ok",
      message: `${key} tiene formato válido.`,
      valuePreview: url.toString(),
    };
  } catch {
    return {
      key,
      status: "error",
      message: `${key} no tiene formato URL válido.`,
      valuePreview: value,
    };
  }
}

function checkNumericEnv(key: string, fallbackDescription: string): EnvCheck {
  const value = getEnvValue(key);

  if (!value) {
    return {
      key,
      status: "warning",
      message: `${key} no está configurado. Se usará ${fallbackDescription}.`,
    };
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return {
      key,
      status: "error",
      message: `${key} debe ser un número positivo.`,
      valuePreview: value,
    };
  }

  return {
    key,
    status: "ok",
    message: `${key} configurado correctamente.`,
    valuePreview: value,
  };
}

function checkModelListEnv(key: string): EnvCheck {
  const value = getEnvValue(key);

  if (!value) {
    return {
      key,
      status: "warning",
      message: `${key} no está configurado. El sistema puede caer en fallback por defecto.`,
    };
  }

  const models = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!models.length) {
    return {
      key,
      status: "error",
      message: `${key} está vacío o mal formado.`,
      valuePreview: value,
    };
  }

  return {
    key,
    status: "ok",
    message: `${key} tiene ${models.length} modelo(s) configurado(s).`,
    valuePreview: models.join(", "),
  };
}

function getWorstStatus(checks: EnvCheck[]): EnvCheckStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}

export function getEnvHealth(): EnvHealthResult {
  const checks: EnvCheck[] = [
    checkRequiredEnv("NEXTAUTH_URL"),
    checkRequiredEnv("NEXTAUTH_SECRET"),

    checkRequiredEnv("OPENAI_API_KEY"),
    checkRequiredEnv("OPENAI_CHAT_MODEL"),
    checkNumericEnv("OPENAI_TEXT_MAX_OUTPUT_TOKENS", "6000"),
    checkNumericEnv("OPENAI_VISUAL_MAX_OUTPUT_TOKENS", "9000"),

    checkRequiredEnv("GEMINI_API_KEY"),
    checkRequiredEnv("GEMINI_MODEL"),

    checkRequiredEnv("OPENROUTER_API_KEY"),
    checkRequiredEnv("OPENROUTER_MODEL"),
    checkModelListEnv("OPENROUTER_MODEL_LIST"),
    checkModelListEnv("OPENROUTER_TEXT_MODEL_LIST"),
    checkModelListEnv("OPENROUTER_VISION_MODEL_LIST"),

    checkRequiredEnv("GOOGLE_CLIENT_ID"),
    checkRequiredEnv("GOOGLE_CLIENT_SECRET"),
    checkUrlEnv(
      "GOOGLE_REDIRECT_URI",
      "http://localhost:3000/api/google/oauth/callback"
    ),
    checkRequiredEnv("GOOGLE_REFRESH_TOKEN"),
    checkRequiredEnv("GOOGLE_DRIVE_FOLDER_ID"),
  ];

  const status = getWorstStatus(checks);

  const summary = checks.reduce(
    (currentSummary, check) => {
      currentSummary.total += 1;
      currentSummary[check.status] += 1;

      return currentSummary;
    },
    {
      total: 0,
      ok: 0,
      warning: 0,
      error: 0,
    }
  );

  return {
    success: status !== "error",
    status,
    summary,
    checks,
  };
}