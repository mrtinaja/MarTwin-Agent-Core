"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, MessageSquareText, Mail, 
  CalendarDays, HardDrive, FileText, StickyNote,
  LogOut, RefreshCcw, Briefcase, User, Code2 // Sumamos Code2 para DEV
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Lógica de detección de cuenta
  const isSquad = session?.user?.email?.endsWith('@squad.com.ar');

  const links = [
    { href: `/`, label: "PANEL", icon: LayoutDashboard },
    { href: `/dev`, label: "DESARROLLO", icon: Code2 }, // NUEVA SECCIÓN DEV
    { href: `/chat`, label: "CHAT IA", icon: MessageSquareText },
    { href: `/email`, label: "EMAILS", icon: Mail },
    { href: `/drive`, label: "DRIVE SQUAD", icon: HardDrive },
    { href: `/calendar`, label: "AGENDA", icon: CalendarDays },
    { href: `/docs`, label: "DOCUMENTOS", icon: FileText },
    { href: `/tasks`, label: "PLANES", icon: StickyNote },
  ];

  return (
    <aside className="w-60 min-w-[240px] h-screen p-6 flex flex-col bg-[#020202] border-r border-[#08646E]/20 z-50 overflow-hidden">
      
      {/* BRANDING ZURICH */}
      <div className="mb-12 text-center">
        <h1 className="text-lg tracking-[0.5em] text-[#08646E] font-light uppercase italic">MarTwin</h1>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#08646E]/30 to-transparent mt-4"></div>
      </div>
      
      {/* NAVEGACIÓN PRINCIPAL */}
      <nav className="flex-1 flex flex-col gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const IconComponent = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`group relative flex items-center gap-4 px-4 py-3 transition-all duration-500 ${
                isActive ? 'bg-gradient-to-r from-[#08646E]/10 to-transparent' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Barra lateral indicadora */}
              <div className={`absolute left-0 w-[2px] h-4 transition-all duration-500 ${
                isActive ? 'bg-[#08646E] shadow-[0_0_12px_#08646E]' : 'bg-transparent'
              }`} />

              <IconComponent 
                size={18} 
                strokeWidth={1.2} 
                className={isActive ? 'text-[#08646E]' : 'text-zinc-600 group-hover:text-zinc-400'} 
              />

              <span className={`text-[10px] tracking-[0.4em] uppercase transition-all duration-300 ${
                isActive ? 'text-[#f0e68c] font-medium' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* SECCIÓN INFERIOR: AUTH & USER */}
      <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-5">
        
        {!session ? (
          <button 
            onClick={() => signIn('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#08646E]/10 border border-[#08646E]/30 rounded-xl text-[#08646E] hover:bg-[#08646E]/20 transition-all text-[9px] tracking-widest font-bold uppercase"
          >
            Conectar Agente
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* INDICADOR DE MODO */}
            <div className="flex items-center gap-2 px-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                isSquad ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
              }`} />
              <span className={`text-[8px] tracking-[0.2em] font-bold uppercase ${
                isSquad ? 'text-blue-400/80' : 'text-amber-500/80'
              }`}>
                MODO {isSquad ? 'SQUAD' : 'PERSONAL'}
              </span>
            </div>

            {/* BOTÓN SWITCH DE CUENTA */}
            <button 
              onClick={() => signIn('google', { prompt: 'select_account' })}
              className="flex flex-col items-start gap-1 w-full px-3 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-[#08646E]/40 transition-all"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={12} className="text-[#08646E] group-hover:rotate-180 transition-all duration-500" />
                  <span className="text-[7px] tracking-[0.2em] text-zinc-500 uppercase">Cambiar Perfil</span>
                </div>
                {isSquad ? <User size={10} className="text-zinc-600" /> : <Briefcase size={10} className="text-zinc-600" />}
              </div>
              <div className="text-[9px] text-zinc-400 italic truncate w-full mt-1">
                Hacia {isSquad ? 'Personal' : 'Squad'}
              </div>
            </button>

            {/* BOTÓN SALIR */}
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-2 px-1 py-1 text-zinc-700 hover:text-red-500 transition-all text-[8px] tracking-[0.3em] uppercase italic group"
            >
              <LogOut size={12} className="group-hover:-translate-x-1 transition-transform" /> 
              Cerrar Sistema
            </button>
          </div>
        )}

        {/* IDENTIFICADOR DE AGENTE */}
        <div className="pt-4 border-t border-white/5">
          <div className="text-[7px] tracking-[0.4em] text-[#08646E] uppercase opacity-50 font-bold mb-1.5">
            TERMINAL_ID // ACTIVO
          </div>
          <div className="text-[10px] text-zinc-500 truncate font-mono lowercase tracking-tighter italic select-none">
             {session?.user?.email || "agente_desconectado"}
          </div>
        </div>
      </div>
    </aside>
  );
}