import { headers } from "next/headers";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  XCircle,
} from "lucide-react";

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

function getStatusIcon(status: HealthStatus) {
  if (status === "ok") {
    return <CheckCircle2 size={18} />;
  }

  if (status === "warning") {
    return <AlertTriangle size={18} />;
  }

  return <XCircle size={18} />;
}

function getStatusClasses(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (status === "warning") {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
  }

  return "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300";
}

function getCardClasses(status: HealthStatus) {
  if (status === "ok") {
    return "border-emerald-500/15 bg-[#fbf9ff] dark:border-emerald-400/20 dark:bg-[#0f0a24]";
  }

  if (status === "warning") {
    return "border-yellow-500/15 bg-[#fbf9ff] dark:border-yellow-400/20 dark:bg-[#0f0a24]";
  }

  return "border-red-500/15 bg-[#fbf9ff] dark:border-red-400/20 dark:bg-[#0f0a24]";
}

async function getHealth(): Promise<HealthResult | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";

    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie");

    const response = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
      headers: cookie
        ? {
            cookie,
          }
        : undefined,
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
      <div className="min-h-screen overflow-y-auto bg-[#f1ecfa] p-6 font-sans text-[#1e1248] transition-colors duration-300 dark:bg-[#070511] dark:text-white md:p-10">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-500/20 bg-[#fbf9ff] p-6 shadow-sm dark:border-red-400/25 dark:bg-[#0f0a24]">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-300">
              <XCircle size={22} />
              <p className="text-[10px] font-normal uppercase tracking-[0.25em]">
                MarTwin Health
              </p>
            </div>

            <h1 className="mt-4 text-2xl font-normal tracking-tight text-[#1e1248] dark:text-white">
              No se pudo consultar el estado del sistema
            </h1>

            <p className="mt-3 text-sm font-normal leading-6 text-[#1e1248]/60 dark:text-white/55">
              Revisá que el servidor esté levantado y que{" "}
              <span className="text-[#e50051]">/api/health</span> responda
              correctamente.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f1ecfa] p-6 font-sans text-[#1e1248] selection:bg-[#e50051]/10 selection:text-[#e50051] transition-colors duration-300 dark:bg-[#070511] dark:text-white md:p-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-2xl border border-[#1e1248]/10 bg-[#fbf9ff] p-6 shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#0f0a24]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#e50051]/10 p-2 text-[#e50051]">
                  <Activity size={20} />
                </div>

                <p className="text-[10px] font-normal uppercase tracking-[0.25em] text-[#1e1248]/45 dark:text-white/45">
                  MarTwin Health
                </p>
              </div>

              <h1 className="mt-4 text-2xl font-normal tracking-tight text-[#1e1248] dark:text-white md:text-3xl">
                Diagnóstico del núcleo
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-normal leading-6 text-[#1e1248]/60 dark:text-white/55">
                Estado centralizado de variables, Google OAuth/Drive, modelos IA
                y email. Un warning no implica caída: indica funcionamiento
                degradado o una observación controlada.
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-normal uppercase tracking-[0.22em] ${getStatusClasses(
                health.status
              )}`}
            >
              {getStatusIcon(health.status)}
              Global {getStatusLabel(health.status)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#1e1248]/10 bg-[#f1ecfa] p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#1e1248]/40 dark:text-white/40">
                Total
              </p>
              <p className="mt-2 text-3xl font-normal text-[#1e1248] dark:text-white">
                {health.summary.total}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-300/70">
                OK
              </p>
              <p className="mt-2 text-3xl font-normal text-emerald-700 dark:text-emerald-300">
                {health.summary.ok}
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-4">
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-yellow-700/70 dark:text-yellow-300/70">
                Warning
              </p>
              <p className="mt-2 text-3xl font-normal text-yellow-700 dark:text-yellow-300">
                {health.summary.warning}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/15 bg-red-500/10 p-4">
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-red-700/70 dark:text-red-300/70">
                Error
              </p>
              <p className="mt-2 text-3xl font-normal text-red-700 dark:text-red-300">
                {health.summary.error}
              </p>
            </div>
          </div>

          <p className="mt-5 text-[10px] font-normal uppercase tracking-[0.18em] text-[#1e1248]/35 dark:text-white/35">
            Generado: {new Date(health.generatedAt).toLocaleString("es-AR")}
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {health.sections.map((section) => (
            <article
              key={section.key}
              className={`rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${getCardClasses(
                section.status
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-normal uppercase tracking-[0.25em] text-[#1e1248]/40 dark:text-white/40">
                    {section.key}
                  </p>

                  <h2 className="mt-2 text-lg font-normal leading-tight tracking-tight text-[#1e1248] dark:text-white">
                    {section.message}
                  </h2>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[9px] font-normal uppercase tracking-[0.16em] ${getStatusClasses(
                    section.status
                  )}`}
                >
                  {getStatusLabel(section.status)}
                </span>
              </div>

              {section.summary ? (
                <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="rounded-xl border border-[#1e1248]/5 bg-[#f1ecfa] p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[#1e1248]/35 dark:text-white/35">
                      Total
                    </p>
                    <p className="mt-1 font-normal text-[#1e1248] dark:text-white">
                      {section.summary.total}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/10 p-2">
                    <p className="text-emerald-700/60 dark:text-emerald-300/60">
                      OK
                    </p>
                    <p className="mt-1 font-normal text-emerald-700 dark:text-emerald-300">
                      {section.summary.ok}
                    </p>
                  </div>

                  <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/10 p-2">
                    <p className="text-yellow-700/60 dark:text-yellow-300/60">
                      Warn
                    </p>
                    <p className="mt-1 font-normal text-yellow-700 dark:text-yellow-300">
                      {section.summary.warning}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-500/10 bg-red-500/10 p-2">
                    <p className="text-red-700/60 dark:text-red-300/60">Err</p>
                    <p className="mt-1 font-normal text-red-700 dark:text-red-300">
                      {section.summary.error}
                    </p>
                  </div>
                </div>
              ) : null}

              <Link
                href={section.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#1e1248]/10 bg-[#f1ecfa] px-4 py-2 text-[10px] font-normal uppercase tracking-[0.18em] text-[#1e1248]/60 transition-all hover:border-[#e50051]/30 hover:bg-[#e50051]/5 hover:text-[#e50051] dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:bg-[#e50051]/10 dark:hover:text-[#e50051]"
              >
                Ver JSON
                <ExternalLink size={12} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}