"use client";
export const dynamic = "force-dynamic";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Loader2, Activity, Zap, Globe, Terminal, Cpu, Database, Tag as TagIcon, LogOut
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
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  return <span className="tabular-nums font-normal text-[#e50051]">{elapsed}</span>;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [ping, setPing] = useState(16);
  const [netData, setNetData] = useState<any[]>([]);
  const [clockifyEntries, setClockifyEntries] = useState<any[]>([]);
  const [isLoadingClockify, setIsLoadingClockify] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const fetchClockifyData = useCallback(async () => {
    try {
      const res = await fetch("/api/clockify/entries", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setClockifyEntries(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); } finally { setIsLoadingClockify(false); }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && mounted) {
      setNetData(Array.from({ length: 30 }, (_, i) => ({ name: i, down: Math.floor(Math.random() * 200) + 200 })));
      fetchClockifyData();
      const interval = setInterval(() => {
        setNetData(prev => {
          const lastDown = prev[prev.length - 1]?.down || 340;
          return [...prev.slice(1), { name: Date.now(), down: Math.floor(Math.max(150, Math.min(600, lastDown + (Math.random() * 80 - 40)))) }];
        });
        setPing(Math.floor(Math.random() * 3) + 15);
      }, 2500);
      const clockInterval = setInterval(fetchClockifyData, 15000);
      return () => { clearInterval(interval); clearInterval(clockInterval); };
    }
  }, [status, mounted, fetchClockifyData]);

  const activeTimer = useMemo(() => clockifyEntries.find((e: any) => !e.endTime), [clockifyEntries]);
  const maxRate = useMemo(() => netData.length > 0 ? Math.max(...netData.map(d => d.down)) : 340, [netData]);

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#f1ecfa] dark:bg-[#070511] text-[#1e1248] dark:text-white font-sans overflow-y-auto selection:bg-[#e50051]/10 selection:text-[#e50051]">
      
      {/* HEADER CORPORATIVO */}
      <header className="mb-8 flex justify-between items-center bg-[#fbf9ff] dark:bg-[#0f0a24] p-6 rounded-2xl shadow-sm border border-[#1e1248]/10 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-[#1e1248] dark:text-white flex items-center gap-2">
            Pago TIC <span className="text-[#e50051]">Systems</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <div className={`h-2 w-2 rounded-full ${activeTimer ? 'bg-[#e50051] animate-ping' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-normal uppercase tracking-wider text-gray-500">
              Operador: <span className="text-[#1e1248] dark:text-white">{session?.user?.name || "Invitado"}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className={`text-[10px] font-normal uppercase tracking-wider ${activeTimer ? 'text-[#e50051]' : 'text-gray-400'}`}>
              {activeTimer ? 'Conexión Activa' : 'En Espera'}
            </span>
          </div>
        </div>
        
        <div className="hidden md:block">
          <span className="text-[9px] font-normal text-[#1e1248]/40 dark:text-white/40 border border-[#1e1248]/10 dark:border-white/10 px-3 py-1.5 rounded-lg uppercase tracking-widest bg-[#f1ecfa] dark:bg-white/5">
            Agent Core v6.0
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        
        {/* LATENCY CARD */}
        <div className="p-6 bg-[#fbf9ff] dark:bg-[#0f0a24] border border-[#1e1248]/10 dark:border-white/10 rounded-2xl shadow-sm transition-hover hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-[#1e1248]/5 dark:bg-white/5 rounded-lg text-[#1e1248] dark:text-white">
              <Zap size={18} />
            </div>
            <Activity size={14} className="text-gray-300" />
          </div>
          <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Latencia de Red</p>
          <p className="text-3xl font-normal text-[#1e1248] dark:text-white">{ping}<span className="text-sm ml-1 text-gray-400 font-normal">ms</span></p>
        </div>

        {/* STATUS CARD (DYNAMICA) */}
        <div className={`col-span-1 md:col-span-2 p-6 rounded-2xl border transition-all duration-500 ${
          activeTimer 
          ? 'border-[#e50051]/20 bg-[#fbf9ff] dark:bg-[#0f0a24] shadow-lg shadow-[#e50051]/5' 
          : 'border-[#1e1248]/10 dark:border-white/10 bg-[#fbf9ff] dark:bg-[#0f0a24] shadow-sm'
        }`}>
          <div className="flex justify-between items-center h-full">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Globe className={activeTimer ? "text-[#e50051] animate-pulse" : "text-gray-300"} size={18} />
                <span className={`text-[10px] font-normal uppercase tracking-widest px-2 py-0.5 rounded ${
                   activeTimer ? 'bg-[#e50051] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                }`}>
                  {activeTimer ? "En Proceso" : "Inactivo"}
                </span>
              </div>
              
              {activeTimer ? (
                <div>
                  <h2 className="text-lg font-normal text-[#1e1248] dark:text-white leading-tight mb-1 truncate">
                    {activeTimer.description}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-normal text-[#e50051] flex items-center gap-1">
                      <TagIcon size={10} /> {activeTimer.projectName}
                    </span>
                    <LiveTimer startTime={activeTimer.startTime} />
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm font-normal uppercase tracking-tight">Listo para sincronizar...</p>
              )}
            </div>
            
            <div className="text-right ml-4">
              <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Peak Rate</p>
              <p className="text-2xl font-normal text-[#1e1248] dark:text-white">{maxRate}<span className="text-xs ml-1 opacity-40">Mbps</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 items-start">
        {/* CHART SECTION */}
        <div className="lg:col-span-2 h-[220px] sm:h-[240px] xl:h-[260px] p-5 md:p-6 bg-[#fbf9ff] dark:bg-[#0f0a24] border border-[#1e1248]/10 dark:border-white/10 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-2 font-normal text-xs uppercase tracking-widest text-[#1e1248] dark:text-white">
              <Activity size={16} className="text-[#e50051]"/> Tráfico de Datos
            </div>
            <div className="text-xl md:text-2xl font-normal text-[#1e1248] dark:text-white">
              {netData[netData.length-1]?.down || 0} 
              <span className="text-[10px] ml-2 text-gray-400">MBPS</span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData}>
                <defs>
                  <linearGradient id="colorMagenta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50051" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#e50051" stopOpacity={0}/>
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
        <div className="h-[220px] sm:h-[240px] xl:h-[260px] p-5 md:p-6 bg-[#1e1248] rounded-2xl shadow-xl flex flex-col text-white overflow-hidden">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <Terminal size={18} className="text-[#e50051]" />
            <div className="text-[9px] md:text-[10px] font-normal uppercase tracking-[0.16em]">Historial de Actividad</div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isLoadingClockify ? (
              <div className="flex items-center gap-2 text-xs opacity-50 italic">
                <Loader2 size={12} className="animate-spin" /> Consultando servidor...
              </div>
            ) : (
              clockifyEntries.map((e: any) => {
                const isLive = !e.endTime;
                return (
                  <div key={e.id} className={`group p-3 rounded-xl transition-all border ${
                    isLive ? 'bg-white/10 border-[#e50051]/30 shadow-lg' : 'bg-black/20 border-transparent opacity-60 hover:opacity-100'
                  }`}>
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`text-[8px] font-normal px-2 py-0.5 rounded ${
                        isLive ? 'bg-[#e50051] text-white' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {isLive ? "ACTIVO" : "TERMINADO"}
                      </span>
                      <span className="text-[9px] font-normal opacity-40 italic">
                        {e.startTime ? new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                      </span>
                    </div>
                    <div className="text-xs font-normal truncate group-hover:text-[#e50051] transition-colors uppercase tracking-tight">
                      {e.description || "Sin descripción"}
                    </div>
                    <div className="text-[9px] mt-1 font-normal text-[#e50051]/70 uppercase">
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
          className="group flex items-center gap-2 px-6 py-3 text-[10px] font-normal text-gray-400 hover:text-[#e50051] transition-all uppercase tracking-[0.3em]"
        >
          <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          Finalizar Sesión Segura
        </button>
      </div>
    </div>
  );
}
