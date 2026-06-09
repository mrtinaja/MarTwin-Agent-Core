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

function getStatusLabel(status: HealthStatus) {
  if (status === "ok") {
    return "OK";
  }

  if (status === "warning") {
    return "WARNING";
  }

  return "ERROR";
}

function getStatusClasses(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "warning") {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-200";
  }

  return "border-red-400/40 bg-red-400/10 text-red-200";
}

function getCardClasses(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-400/20 bg-emerald-400/[0.04]";
  }

  if (status === "warning") {
    return "border-yellow-400/20 bg-yellow-400/[0.04]";
  }

  return "border-red-400/20 bg-red-400/[0.04]";
}

async function getHealth(): Promise<HealthResult | null> {
  try {
    const baseUrl =
      process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
    });

    const data = (await response.json()) as HealthResult;

    return data;
  } catch {
    return null;
  }
}

export default async function HealthPage() {
  const health = await getHealth();

  if (!health) {
    return (
      <main className="min-h-screen bg-[#05020f] px-6 py-8 text-white">
        <section className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-red-200">
              MarTwin Health
            </p>

            <h1 className="mt-3 text-3xl font-semibold">
              No se pudo consultar el estado del sistema
            </h1>

            <p className="mt-3 text-sm text-red-100/80">
              Revisá que el servidor esté levantado y que /api/health responda.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05020f] px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#46f2c8]">
                MarTwin Health
              </p>

              <h1 className="mt-3 text-3xl font-semibold">
                Diagnóstico del núcleo
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Estado centralizado de variables, Google OAuth/Drive y modelos
                IA. Un warning no implica caída: indica funcionamiento degradado
                o una observación controlada.
              </p>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClasses(
                health.status
              )}`}
            >
              GLOBAL {getStatusLabel(health.status)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {health.summary.total}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
                OK
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">
                {health.summary.ok}
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/70">
                Warning
              </p>
              <p className="mt-2 text-2xl font-semibold text-yellow-200">
                {health.summary.warning}
              </p>
            </div>

            <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-red-200/70">
                Error
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-200">
                {health.summary.error}
              </p>
            </div>
          </div>

          <p className="mt-5 text-xs text-white/35">
            Generado: {new Date(health.generatedAt).toLocaleString("es-AR")}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {health.sections.map((section) => (
            <article
              key={section.key}
              className={`rounded-3xl border p-5 ${getCardClasses(
                section.status
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                    {section.key}
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    {section.message}
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    section.status
                  )}`}
                >
                  {getStatusLabel(section.status)}
                </span>
              </div>

              {section.summary ? (
                <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-black/20 p-2">
                    <p className="text-white/35">Total</p>
                    <p className="mt-1 font-semibold">{section.summary.total}</p>
                  </div>

                  <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-200">
                    <p className="text-emerald-200/60">OK</p>
                    <p className="mt-1 font-semibold">{section.summary.ok}</p>
                  </div>

                  <div className="rounded-xl bg-yellow-400/10 p-2 text-yellow-200">
                    <p className="text-yellow-200/60">Warn</p>
                    <p className="mt-1 font-semibold">
                      {section.summary.warning}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-400/10 p-2 text-red-200">
                    <p className="text-red-200/60">Err</p>
                    <p className="mt-1 font-semibold">{section.summary.error}</p>
                  </div>
                </div>
              ) : null}

              <a
                href={section.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Ver JSON
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}