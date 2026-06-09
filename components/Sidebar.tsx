"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, MessageSquareText, Mail,
  CalendarDays, HardDrive, FileText, StickyNote,
  LogOut, RefreshCcw, Code2,
  Zap, ShieldCheck, Moon, Sun
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isSquad = session?.user?.email?.endsWith('@squad.com.ar');

  useEffect(() => {
    localStorage.removeItem('martwin-theme');
    const shouldUseDark = localStorage.getItem('martwin-theme') === 'dark';

    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((currentMode) => {
      const nextMode = !currentMode;
      document.documentElement.classList.toggle('dark', nextMode);
      localStorage.setItem('martwin-theme', nextMode ? 'dark' : 'light');
      return nextMode;
    });
  };

  const links = [
    { href: `/`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/dev`, label: "Dev Environment", icon: Code2 },
    { href: `/chat`, label: "AI Assistant", icon: MessageSquareText },
    { href: `/email`, label: "Communications", icon: Mail },
    { href: `/drive`, label: "Cloud Storage", icon: HardDrive },
    { href: `/calendar`, label: "Schedule", icon: CalendarDays },
    { href: `/docs`, label: "Documentation", icon: FileText },
    { href: `/tasks`, label: "Action Plans", icon: StickyNote },
  ];

  return (
    <aside className="w-64 min-w-[256px] h-screen p-6 flex flex-col bg-[#fbf9ff] dark:bg-[#0f0a24] border-r border-[#1e1248]/10 dark:border-white/10 z-50 overflow-hidden font-sans shadow-[4px_0_24px_rgba(30,18,72,0.05)] dark:shadow-[4px_0_28px_rgba(0,0,0,0.35)] transition-colors duration-300">

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

        <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-[#1e1248]/5 dark:bg-white/5 rounded-full border border-[#1e1248]/5 dark:border-white/10">
          <div className="w-1.5 h-1.5 bg-[#e50051] rounded-full animate-pulse shadow-[0_0_8px_rgba(229,0,81,0.4)]"></div>
          <span className="text-[9px] tracking-widest text-[#1e1248]/60 dark:text-white/60 uppercase font-normal">Connected</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
        <span className="text-[10px] font-normal text-gray-400 dark:text-white/35 mb-3 px-4 uppercase tracking-[0.2em]">Menu Principal</span>

        {links.map((link) => {
          const isActive = pathname === link.href;
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-[#1e1248] text-white shadow-lg shadow-[#1e1248]/20'
                  : 'text-gray-500 dark:text-white/55 hover:text-[#1e1248] dark:hover:text-white hover:bg-[#f1ecfa] dark:hover:bg-white/5'
              }`}
            >
              <IconComponent
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-[#e50051]' : 'text-gray-400 dark:text-white/35 group-hover:text-[#1e1248] dark:group-hover:text-white'}
              />

              <span className={`text-[13px] tracking-tight ${
                isActive ? 'font-normal' : 'font-normal'
              }`}>
                {link.label}
              </span>

              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 bg-[#e50051] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER: SESSION & STATUS */}
      <div className="mt-auto pt-6 border-t border-[#1e1248]/10 dark:border-white/10 flex flex-col gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-pressed={isDarkMode}
          aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#1e1248]/10 bg-[#f1ecfa] px-3 text-[#1e1248] transition-all hover:border-[#e50051]/30 hover:bg-[#e50051]/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-[#e50051]/10"
        >
          <span className="flex min-w-0 items-center gap-2 text-[8px] font-normal uppercase tracking-[0.14em]">
            {isDarkMode ? <Moon size={13} className="shrink-0 text-[#e50051]" /> : <Sun size={13} className="shrink-0 text-[#e50051]" />}
            <span className="truncate">{isDarkMode ? 'Oscuro' : 'Claro'}</span>
          </span>
          <span className={`relative h-4 w-8 shrink-0 rounded-full border transition-colors duration-300 ${
            isDarkMode ? 'bg-[#e50051] border-[#e50051]' : 'bg-[#fbf9ff] border-[#1e1248]/15'
          }`}>
            <span className={`absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-300 ${
              isDarkMode ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </span>
        </button>

        {!session ? (
          <button
            onClick={() => signIn('google')}
            className="flex items-center justify-center gap-3 w-full py-3 bg-[#e50051] hover:bg-[#c40045] text-white rounded-xl transition-all shadow-lg shadow-[#e50051]/20 font-normal text-[10px] uppercase tracking-widest"
          >
            <Zap size={14} fill="currentColor" />
            Acceso Agente
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* USER STATUS PLATE */}
            <div className="flex items-center gap-3 px-3 py-3 bg-[#f1ecfa] dark:bg-white/5 border border-[#1e1248]/10 dark:border-white/10 rounded-2xl group">
              <div className="relative flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full ${isSquad ? 'bg-[#1e1248] dark:bg-white' : 'bg-[#e50051]'} relative border-2 border-white dark:border-[#0f0a24] shadow-sm`} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-[#1e1248] dark:text-white font-normal leading-none mb-1 truncate uppercase">
                  {session.user?.name?.split(' ')[0]}
                </span>
                <span className={`text-[8px] font-normal uppercase tracking-widest ${isSquad ? 'text-gray-500 dark:text-white/55' : 'text-[#e50051]'}`}>
                  {isSquad ? 'Squad Unit' : 'External Access'}
                </span>
              </div>
              <ShieldCheck size={16} className="ml-auto text-gray-300 dark:text-white/25 group-hover:text-[#e50051] transition-colors" />
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => signIn('google', { prompt: 'select_account' })}
                className="flex-1 flex items-center justify-center py-2 bg-[#fbf9ff] dark:bg-white/5 border border-[#1e1248]/10 dark:border-white/10 hover:border-[#1e1248] dark:hover:border-[#e50051]/40 transition-all text-gray-400 dark:text-white/35 hover:text-[#1e1248] dark:hover:text-white rounded-xl shadow-sm"
              >
                <RefreshCcw size={14} />
              </button>

              <button
                onClick={() => signOut()}
                className="flex-1 flex items-center justify-center py-2 bg-[#fbf9ff] dark:bg-white/5 border border-[#1e1248]/10 dark:border-white/10 hover:border-red-100 dark:hover:border-red-400/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-gray-400 dark:text-white/35 hover:text-red-500 rounded-xl shadow-sm"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center opacity-40 mt-1">
            <span className="text-[7px] font-normal text-[#1e1248] dark:text-white tracking-[0.3em] uppercase">
              System Core v6.0
            </span>
            <span className="text-[6px] font-normal text-gray-400 dark:text-white/35 uppercase mt-1">
              MarTwin Industrial Intelligence
            </span>
        </div>
      </div>
    </aside>
  );
}
