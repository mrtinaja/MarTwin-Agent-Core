"use client";

import Link from 'next/link';
import NextImage from 'next/image'; 
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, MessageSquareText, Mail, 
  CalendarDays, HardDrive, FileText, StickyNote,
  LogOut, RefreshCcw, Briefcase, User, Code2,
  Zap, Globe, ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isSquad = session?.user?.email?.endsWith('@squad.com.ar');

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
    <aside className="w-64 min-w-[256px] h-screen p-6 flex flex-col bg-[#000000] border-r border-white/5 z-50 overflow-hidden font-sans">
      
      {/* BRANDING: LOGO.WEBP + MARTWIN SVG */}
      <div className="flex flex-col items-center justify-center mb-10 mt-2 group px-4">
        
       {/* Icono logo.webp */}
<div className="mb-2 flex items-center justify-center">
  <NextImage 
    src="/logo.webp" 
    alt="Agent Icon"
    width={48}    // Tamaño fijo en px
    height={48}   // Tamaño fijo en px
    priority
    className="object-contain"
    // Esto ayudará a ver si el navegador al menos intenta cargar algo
    onLoadingComplete={() => console.log("Logo loaded successfully")}
    onError={() => console.error("Logo failed to load at /logo.webp")}
  />
</div>

        <div className="relative w-full h-16 flex items-center justify-center">
          <svg viewBox="0 0 300 80" className="w-full h-full object-contain">
            {/* Main Text: MarTwin */}
            <text 
              x="150" y="40" textAnchor="middle" 
              fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="48" 
              fill="#08646e" letterSpacing="-1.5"
            >
              MarTwin
            </text>

            <line x1="40" y1="52" x2="260" y2="52" stroke="#08646e" strokeWidth="1.5" opacity="0.4" />

            {/* Slogan: CONNECTING INNOVATION */}
            <text 
              x="150" y="70" textAnchor="middle" 
              fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="14" 
              fill="#e4b32b" letterSpacing="3" className="uppercase"
            >
              CONNECTING INNOVATION
            </text>
          </svg>
        </div>
        
        <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
          <div className="w-1.5 h-1.5 bg-[#08646e] rounded-full animate-pulse shadow-[0_0_8px_#08646e]"></div>
          <span className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase font-bold">Stable Link</span>
        </div>
      </div>
      
      {/* NAVIGATION SECTORS */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-2 scrollbar-none">
        <span className="text-[10px] font-bold text-zinc-600 mb-4 px-4 uppercase tracking-[0.2em]">Navigation</span>
        
        {links.map((link) => {
          const isActive = pathname === link.href;
          const IconComponent = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white/[0.03] text-white border border-white/5 shadow-md shadow-black' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.01]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-[#08646e] rounded-full shadow-[0_0_10px_rgba(8,100,110,0.6)]" />
              )}

              <IconComponent 
                size={18} 
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-[#08646e]' : 'text-zinc-600 group-hover:text-zinc-400'} 
              />

              <span className={`text-[13px] tracking-tight transition-all duration-300 ${
                isActive ? 'font-bold' : 'font-medium'
              }`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER: SESSION & STATUS */}
      <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4 flex-shrink-0">
        {!session ? (
          <button 
            onClick={() => signIn('google')}
            className="flex items-center justify-center gap-3 w-full py-3 bg-[#08646e] hover:bg-[#0a7a87] text-white rounded-xl transition-all shadow-lg shadow-[#08646e]/20 font-bold text-xs uppercase tracking-widest"
          >
            <Zap size={15} fill="currentColor" />
            Connect Agent
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* USER STATUS PLATE */}
            <div className="flex items-center gap-3 px-3 py-2 bg-[#0a0a0a] border border-white/5 rounded-xl group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-[1px] ${isSquad ? 'bg-[#08646e]' : 'bg-[#e4b32b]'}`} />
              <div className="relative flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${isSquad ? 'bg-[#08646e]' : 'bg-[#e4b32b]'} animate-ping absolute opacity-30`} />
                <div className={`w-2 h-2 rounded-full ${isSquad ? 'bg-[#08646e]' : 'bg-[#e4b32b]'} relative shadow-[0_0_8px_currentColor]`} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] text-white font-bold leading-none mb-1 truncate">
                  {session.user?.name?.split(' ')[0]}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isSquad ? 'text-[#08646e]' : 'text-[#e4b32b]'}`}>
                  {isSquad ? 'Squad Unit' : 'Private Mode'}
                </span>
              </div>
              <ShieldCheck size={16} className="ml-auto text-zinc-800" />
            </div>

           {/* QUICK ACTIONS - CORREGIDO PARA UNA SOLA FILA */}
<div className="flex items-center gap-2 w-full">
  <button 
    onClick={() => signIn('google', { prompt: 'select_account' })}
    title="Switch Profile"
    className="flex-1 flex items-center justify-center py-2 bg-[#0a0a0a] border border-white/5 hover:border-[#08646e]/40 transition-all text-zinc-600 hover:text-white rounded-lg"
  >
    <RefreshCcw size={14} />
    <span className="ml-2 text-[8px] uppercase font-bold tracking-tighter">Switch</span>
  </button>
  
  <button 
    onClick={() => signOut()}
    title="Disconnect"
    className="flex-1 flex items-center justify-center py-2 bg-[#0a0a0a] border border-white/5 hover:border-red-900/30 transition-all text-zinc-600 hover:text-red-400 group rounded-lg"
  >
    <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
    <span className="ml-2 text-[8px] uppercase font-bold tracking-tighter">Exit</span>
  </button>
</div>
          </div>
        )}

        <div className="flex items-center justify-between px-2 opacity-30 mt-1 border-t border-white/5 pt-4">
            <span className="text-[8px] font-mono text-zinc-600 tracking-tighter uppercase font-bold text-center w-full">SYSTEM_CORE V5.0 // ONLINE</span>
        </div>
      </div>
    </aside>
  );
}