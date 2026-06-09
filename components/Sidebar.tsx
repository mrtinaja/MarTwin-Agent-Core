"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquareText,
  Mail,
  CalendarDays,
  HardDrive,
  FileText,
  StickyNote,
  LogOut,
  RefreshCcw,
  Code2,
  Zap,
  ShieldCheck,
  Moon,
  Sun,
  HeartPulse,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isSquad = session?.user?.email?.endsWith("@squad.com.ar");

  useEffect(() => {
    const savedTheme = localStorage.getItem("martwin-theme");

    const shouldUseDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((currentMode) => {
      const nextMode = !currentMode;

      document.documentElement.classList.toggle("dark", nextMode);
      localStorage.setItem("martwin-theme", nextMode ? "dark" : "light");

      return nextMode;
    });
  };

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dev", label: "Dev Environment", icon: Code2 },
    { href: "/chat", label: "AI Assistant", icon: MessageSquareText },
    { href: "/email", label: "Communications", icon: Mail },
    { href: "/drive", label: "Cloud Storage", icon: HardDrive },
    { href: "/calendar", label: "Schedule", icon: CalendarDays },
    { href: "/docs", label: "Documentation", icon: FileText },
    { href: "/tasks", label: "Action Plans", icon: StickyNote },
    { href: "/health", label: "Health", icon: HeartPulse },
  ];

  return (
    <aside className="z-50 flex h-screen w-64 min-w-[256px] flex-col overflow-hidden border-r border-[#1e1248]/10 bg-[#fbf9ff] p-6 font-sans shadow-[4px_0_24px_rgba(30,18,72,0.05)] transition-colors duration-300 dark:border-white/10 dark:bg-[#0f0a24] dark:shadow-[4px_0_28px_rgba(0,0,0,0.35)]">
      {/* BRANDING */}
      <div className="mb-8 mt-1 flex flex-col items-center justify-center px-2">
        <div className="relative flex w-full items-center gap-3 rounded-2xl border border-[#1e1248]/10 bg-white/70 p-3 shadow-sm shadow-[#1e1248]/5 dark:border-white/10 dark:bg-white/5">
          <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-[#1e1248] shadow-lg shadow-[#1e1248]/20 dark:bg-white">
            <div className="absolute inset-1 rounded-[14px] border border-[#e50051]/35" />

            <svg
              viewBox="0 0 64 64"
              className="h-full w-full"
              role="img"
              aria-label="MarTwin"
            >
              <path
                d="M15 43V20l11 14 11-14v23"
                fill="none"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="6"
                className="dark:stroke-[#1e1248]"
              />
              <path
                d="M39 20h12M45 20v24"
                fill="none"
                stroke="#e50051"
                strokeLinecap="round"
                strokeWidth="6"
              />
              <path
                d="M10 48c12 6 33 6 45-7"
                fill="none"
                stroke="#e50051"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline">
              <span className="text-[23px] leading-none tracking-normal text-[#1e1248] dark:text-white">
                Mar
              </span>
              <span className="text-[23px] font-normal leading-none tracking-normal text-[#e50051]">
                Twin
              </span>
            </div>

            <p className="mt-1 text-[8px] font-normal uppercase tracking-[0.18em] text-[#1e1248]/45 dark:text-white/45">
              Intelligence Core
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-[#1e1248]/5 bg-[#1e1248]/5 px-3 py-1 dark:border-white/10 dark:bg-white/5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e50051] shadow-[0_0_8px_rgba(229,0,81,0.4)]" />
          <span className="text-[9px] font-normal uppercase tracking-widest text-[#1e1248]/60 dark:text-white/60">
            Connected
          </span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto pr-2">
        <span className="mb-3 px-4 text-[10px] font-normal uppercase tracking-[0.2em] text-gray-400 dark:text-white/35">
          Menu Principal
        </span>

        {links.map((link) => {
          const isActive = pathname === link.href;
          const IconComponent = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
                isActive
                  ? "bg-[#1e1248] text-white shadow-lg shadow-[#1e1248]/20"
                  : "text-gray-500 hover:bg-[#f1ecfa] hover:text-[#1e1248] dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <IconComponent
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={
                  isActive
                    ? "text-[#e50051]"
                    : "text-gray-400 group-hover:text-[#1e1248] dark:text-white/35 dark:group-hover:text-white"
                }
              />

              <span className="text-[13px] font-normal tracking-tight">
                {link.label}
              </span>

              {isActive && (
                <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[#e50051]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER: SESSION & STATUS */}
      <div className="mt-auto flex shrink-0 flex-col gap-4 border-t border-[#1e1248]/10 pt-6 dark:border-white/10">
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-pressed={isDarkMode}
          aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#1e1248]/10 bg-[#f1ecfa] px-3 text-[#1e1248] transition-all hover:border-[#e50051]/30 hover:bg-[#e50051]/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-[#e50051]/10"
        >
          <span className="flex min-w-0 items-center gap-2 text-[8px] font-normal uppercase tracking-[0.14em]">
            {isDarkMode ? (
              <Moon size={13} className="shrink-0 text-[#e50051]" />
            ) : (
              <Sun size={13} className="shrink-0 text-[#e50051]" />
            )}

            <span className="truncate">
              {isDarkMode ? "Oscuro" : "Claro"}
            </span>
          </span>

          <span
            className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors duration-300 ${
              isDarkMode
                ? "border-[#e50051] bg-[#e50051]"
                : "border-[#1e1248]/15 bg-[#fbf9ff]"
            }`}
          >
            <span
              className={`absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                isDarkMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>

        {!session ? (
          <button
            onClick={() => signIn("google")}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#e50051] py-3 text-[10px] font-normal uppercase tracking-widest text-white shadow-lg shadow-[#e50051]/20 transition-all hover:bg-[#c40045]"
          >
            <Zap size={14} fill="currentColor" />
            Acceso Agente
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* USER STATUS PLATE */}
            <div className="group flex items-center gap-3 rounded-2xl border border-[#1e1248]/10 bg-[#f1ecfa] px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <div className="relative flex items-center justify-center">
                <div
                  className={`relative h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm dark:border-[#0f0a24] ${
                    isSquad ? "bg-[#1e1248] dark:bg-white" : "bg-[#e50051]"
                  }`}
                />
              </div>

              <div className="flex flex-col overflow-hidden">
                <span className="mb-1 truncate text-xs font-normal uppercase leading-none text-[#1e1248] dark:text-white">
                  {session.user?.name?.split(" ")[0]}
                </span>

                <span
                  className={`text-[8px] font-normal uppercase tracking-widest ${
                    isSquad
                      ? "text-gray-500 dark:text-white/55"
                      : "text-[#e50051]"
                  }`}
                >
                  {isSquad ? "Squad Unit" : "External Access"}
                </span>
              </div>

              <ShieldCheck
                size={16}
                className="ml-auto text-gray-300 transition-colors group-hover:text-[#e50051] dark:text-white/25"
              />
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex w-full items-center gap-2">
              <button
                onClick={() => signIn("google", { prompt: "select_account" })}
                className="flex flex-1 items-center justify-center rounded-xl border border-[#1e1248]/10 bg-[#fbf9ff] py-2 text-gray-400 shadow-sm transition-all hover:border-[#1e1248] hover:text-[#1e1248] dark:border-white/10 dark:bg-white/5 dark:text-white/35 dark:hover:border-[#e50051]/40 dark:hover:text-white"
              >
                <RefreshCcw size={14} />
              </button>

              <button
                onClick={() => signOut()}
                className="flex flex-1 items-center justify-center rounded-xl border border-[#1e1248]/10 bg-[#fbf9ff] py-2 text-gray-400 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 dark:border-white/10 dark:bg-white/5 dark:text-white/35 dark:hover:border-red-400/30 dark:hover:bg-red-500/10"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 flex flex-col items-center opacity-40">
          <span className="text-[7px] font-normal uppercase tracking-[0.3em] text-[#1e1248] dark:text-white">
            System Core v6.0
          </span>
          <span className="mt-1 text-[6px] font-normal uppercase text-gray-400 dark:text-white/35">
            MarTwin Industrial Intelligence
          </span>
        </div>
      </div>
    </aside>
  );
}