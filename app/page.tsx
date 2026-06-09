"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Loader2,
  Activity,
  Zap,
  Globe,
  Terminal,
  Tag as TagIcon,
  LogOut,
  HeartPulse,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// --- LIVE CHRONOMETER COMPONENT ---
const LiveTimer = ({ startTime }: { startTime: string }) => {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setElapsed(
        `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };

    calculate();

    const timer = setInterval(calculate, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <span className="tabular-nums font-normal text-[#e50051]">
      {elapsed}
    </span>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();

  const [mounted, setMounted] = useState(false);
  const [ping, setPing] = useState(16);
  const [netData, setNetData] = useState<any[]>([]);
  const [clockifyEntries, setClockifyEntries] = useState<any[]>([]);
  const [isLoadingClockify, setIsLoadingClockify] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchClockifyData = useCallback(async () => {
    try {
      const res = await fetch("/api/clockify/entries", {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setClockifyEntries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingClockify(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && mounted) {
      setNetData(
        Array.from({ length: 30 }, (_, i) => ({
          name: i,
          down: Math.floor(Math.random() * 200) + 200,
        }))
      );

      fetchClockifyData();

      const interval = setInterval(() => {
        setNetData((prev) => {
          const lastDown = prev[prev.length - 1]?.down || 340;

          return [
            ...prev.slice(1),
            {
              name: Date.now(),
              down: Math.floor(
                Math.max(
                  150,
                  Math.min(600, lastDown + (Math.random() * 80 - 40))
                )
              ),
            },
          ];
        });

        setPing(Math.floor(Math.random() * 3) + 15);
      }, 2500);

      const clockInterval = setInterval(fetchClockifyData, 15000);

      return () => {
        clearInterval(interval);
        clearInterval(clockInterval);
      };
    }
  }, [status, mounted, fetchClockifyData]);

  const activeTimer = useMemo(
    () => clockifyEntries.find((e: any) => !e.endTime),
    [clockifyEntries]
  );

  const maxRate = useMemo(
    () => (netData.length > 0 ? Math.max(...netData.map((d) => d.down)) : 340),
    [netData]
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f1ecfa] p-6 font-sans text-[#1e1248] selection:bg-[#e50051]/10 selection:text-[#e50051] dark:bg-[#070511] dark:text-white md:p-10">
      {/* HEADER CORPORATIVO */}
      <header className="mb-8 flex items-center justify-between rounded-2xl border border-[#1e1248]/10 bg-[#fbf9ff] p-6 shadow-sm dark:border-white/10 dark:bg-[#0f0a24]">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-normal tracking-tight text-[#1e1248] dark:text-white">
            MarTwin <span className="text-[#e50051]">Systems</span>
          </h1>

          <div className="mt-1 flex items-center gap-3">
            <div
              className={`h-2 w-2 rounded-full ${
                activeTimer ? "animate-ping bg-[#e50051]" : "bg-gray-300"
              }`}
            />

            <span className="text-[10px] font-normal uppercase tracking-wider text-gray-500">
              Operador:{" "}
              <span className="text-[#1e1248] dark:text-white">
                {session?.user?.name || "Invitado"}
              </span>
            </span>

            <span className="text-gray-300">|</span>

            <span
              className={`text-[10px] font-normal uppercase tracking-wider ${
                activeTimer ? "text-[#e50051]" : "text-gray-400"
              }`}
            >
              {activeTimer ? "Conexión Activa" : "En Espera"}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/health"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e50051]/20 bg-[#e50051]/10 px-4 py-2 text-[10px] font-normal uppercase tracking-[0.22em] text-[#e50051] transition hover:border-[#e50051]/40 hover:bg-[#e50051]/15"
          >
            <HeartPulse size={14} />
            Health
          </Link>

          <span className="rounded-lg border border-[#1e1248]/10 bg-[#f1ecfa] px-3 py-1.5 text-[9px] font-normal uppercase tracking-widest text-[#1e1248]/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
            Agent Core v6.0
          </span>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* LATENCY CARD */}
        <div className="transition-hover rounded-2xl border border-[#1e1248]/10 bg-[#fbf9ff] p-6 shadow-sm hover:shadow-md dark:border-white/10 dark:bg-[#0f0a24]">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-[#1e1248]/5 p-2 text-[#1e1248] dark:bg-white/5 dark:text-white">
              <Zap size={18} />
            </div>

            <Activity size={14} className="text-gray-300" />
          </div>

          <p className="text-xs font-normal uppercase tracking-wider text-gray-400">
            Latencia de Red
          </p>

          <p className="text-3xl font-normal text-[#1e1248] dark:text-white">
            {ping}
            <span className="ml-1 text-sm font-normal text-gray-400">ms</span>
          </p>
        </div>

        {/* STATUS CARD (DINÁMICA) */}
        <div
          className={`col-span-1 rounded-2xl border p-6 transition-all duration-500 md:col-span-2 ${
            activeTimer
              ? "border-[#e50051]/20 bg-[#fbf9ff] shadow-lg shadow-[#e50051]/5 dark:bg-[#0f0a24]"
              : "border-[#1e1248]/10 bg-[#fbf9ff] shadow-sm dark:border-white/10 dark:bg-[#0f0a24]"
          }`}
        >
          <div className="flex h-full items-center justify-between">
            <div className="flex-1 space-y-1">
              <div className="mb-2 flex items-center gap-2">
                <Globe
                  className={
                    activeTimer
                      ? "animate-pulse text-[#e50051]"
                      : "text-gray-300"
                  }
                  size={18}
                />

                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-normal uppercase tracking-widest ${
                    activeTimer
                      ? "bg-[#e50051] text-white"
                      : "bg-gray-100 text-gray-400 dark:bg-white/10"
                  }`}
                >
                  {activeTimer ? "En Proceso" : "Inactivo"}
                </span>
              </div>

              {activeTimer ? (
                <div>
                  <h2 className="mb-1 truncate text-lg font-normal leading-tight text-[#1e1248] dark:text-white">
                    {activeTimer.description}
                  </h2>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] font-normal text-[#e50051]">
                      <TagIcon size={10} /> {activeTimer.projectName}
                    </span>

                    <LiveTimer startTime={activeTimer.startTime} />
                  </div>
                </div>
              ) : (
                <p className="text-sm font-normal uppercase tracking-tight text-gray-400 italic">
                  Listo para sincronizar...
                </p>
              )}
            </div>

            <div className="ml-4 text-right">
              <p className="mb-1 text-[10px] font-normal uppercase tracking-widest text-gray-400">
                Peak Rate
              </p>

              <p className="text-2xl font-normal text-[#1e1248] dark:text-white">
                {maxRate}
                <span className="ml-1 text-xs opacity-40">Mbps</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* CHART SECTION */}
        <div className="flex h-[220px] flex-col overflow-hidden rounded-2xl border border-[#1e1248]/10 bg-[#fbf9ff] p-5 shadow-sm dark:border-white/10 dark:bg-[#0f0a24] sm:h-[240px] md:p-6 lg:col-span-2 xl:h-[260px]">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-widest text-[#1e1248] dark:text-white">
              <Activity size={16} className="text-[#e50051]" /> Tráfico de
              Datos
            </div>

            <div className="text-xl font-normal text-[#1e1248] dark:text-white md:text-2xl">
              {netData[netData.length - 1]?.down || 0}
              <span className="ml-2 text-[10px] text-gray-400">MBPS</span>
            </div>
          </div>

          <div className="h-full min-h-[160px] w-full">
            <ResponsiveContainer
              width="100%"
              height={180}
              minWidth={1}
              minHeight={1}
            >
              <AreaChart data={netData}>
                <defs>
                  <linearGradient
                    id="colorMagenta"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#e50051" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#e50051" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <Area
                  type="monotone"
                  dataKey="down"
                  stroke="#e50051"
                  strokeWidth={3}
                  fill="url(#colorMagenta)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LOG / HISTORY SECTION */}
        <div className="flex h-[220px] flex-col overflow-hidden rounded-2xl bg-[#1e1248] p-5 text-white shadow-xl sm:h-[240px] md:p-6 xl:h-[260px]">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <Terminal size={18} className="text-[#e50051]" />

            <div className="text-[9px] font-normal uppercase tracking-[0.16em] md:text-[10px]">
              Historial de Actividad
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
            {isLoadingClockify ? (
              <div className="flex items-center gap-2 text-xs opacity-50 italic">
                <Loader2 size={12} className="animate-spin" /> Consultando
                servidor...
              </div>
            ) : (
              clockifyEntries.map((e: any) => {
                const isLive = !e.endTime;

                return (
                  <div
                    key={e.id}
                    className={`group rounded-xl border p-3 transition-all ${
                      isLive
                        ? "border-[#e50051]/30 bg-white/10 shadow-lg"
                        : "border-transparent bg-black/20 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="mb-1.5 flex items-start justify-between">
                      <span
                        className={`rounded px-2 py-0.5 text-[8px] font-normal ${
                          isLive
                            ? "bg-[#e50051] text-white"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {isLive ? "ACTIVO" : "TERMINADO"}
                      </span>

                      <span className="text-[9px] font-normal opacity-40 italic">
                        {e.startTime
                          ? new Date(e.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </span>
                    </div>

                    <div className="truncate text-xs font-normal uppercase tracking-tight transition-colors group-hover:text-[#e50051]">
                      {e.description || "Sin descripción"}
                    </div>

                    <div className="mt-1 text-[9px] font-normal uppercase text-[#e50051]/70">
                      {e.projectName}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="flex justify-center">
        <button
          onClick={() => signOut()}
          className="group flex items-center gap-2 px-6 py-3 text-[10px] font-normal uppercase tracking-[0.3em] text-gray-400 transition-all hover:text-[#e50051]"
        >
          <LogOut
            size={14}
            className="transition-transform group-hover:-translate-x-1"
          />
          Finalizar Sesión Segura
        </button>
      </div>
    </div>
  );
}