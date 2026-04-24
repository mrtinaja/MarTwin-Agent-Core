"use client";
export const dynamic = "force-dynamic";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Loader2, Activity, Zap, Globe, Terminal, Cpu, Database, Tag as TagIcon 
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
  return <span className="tabular-nums font-bold">{elapsed}</span>;
};

export default function Dashboard() {
 
  const sessionContext = useSession();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [ping, setPing] = useState(16); // Basado en tu captura
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

  if (!mounted) return null; // Solo para evitar errores de hidratación

  return (
    <div className="p-12 min-h-screen bg-[#020202] text-zinc-300 font-mono font-extralight overflow-y-auto select-none">
      <header className="mb-16 flex justify-between items-start">
        <div>
          <div className="text-4xl tracking-tighter text-[#0ad1ea] uppercase italic mb-4">SYSTEMS <span className="text-white">DASHBOARD</span></div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${activeTimer ? 'bg-[#0ad1ea] shadow-[0_0_10px_#0ad1ea] animate-pulse' : 'bg-[#08646E] animate-ping'}`} />
            OPERATOR: {session?.user?.name?.toUpperCase()} // {activeTimer ? 'LIVE_LINK_ACTIVE' : 'STANDBY_MODE'}
          </div>
        </div>
        <div className="text-[7px] text-zinc-700 uppercase tracking-[0.5em]">Martwin_Agent_Core_v4.2</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* NEURAL LATENCY CARD */}
        <div className="p-8 border border-[#08646E]/20 bg-[#08646E]/5 rounded-3xl relative">
          <Activity size={16} className="absolute top-4 right-4 text-[#08646E] opacity-50" />
          <Zap className="text-[#0ad1ea] mb-4 shadow-[0_0_15px_rgba(10,209,234,0.3)]" size={20} />
          <div className="text-[8px] tracking-[0.3em] text-zinc-500 mb-2 uppercase">Neural Latency</div>
          <div className="text-4xl text-white tracking-tighter">{ping}ms</div>
        </div>

        {/* --- CENTRAL STATUS CARD --- */}
        <div className={`p-8 border rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${
          activeTimer 
          ? 'border-[#0ad1ea]/40 bg-[#0ad1ea]/5 shadow-[0_0_50px_rgba(10,209,234,0.1)]' 
          : 'border-white/5 bg-[#050505]'
        }`}>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <Globe className={activeTimer ? "text-[#0ad1ea] animate-pulse" : "text-[#08646E]"} size={20} />
              <div className={`px-3 py-1 rounded-full border text-[7px] uppercase tracking-widest ${
                activeTimer ? 'border-[#0ad1ea] bg-[#0ad1ea]/10 text-[#0ad1ea] shadow-[0_0_10px_rgba(10,209,234,0.2)]' : 'border-zinc-800 bg-zinc-900/50 text-zinc-600'
              }`}>
                {activeTimer ? "CORE_RUNNING" : "CORE_IDLE"}
              </div>
            </div>

            {activeTimer ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-1xl text-white uppercase tracking-tight leading-tight">
                    {activeTimer.description}
                  </div>
                  <div className="flex gap-2 items-center text-[9px] font-bold">
                    <span className="text-[#0ad1ea] border border-[#0ad1ea]/30 px-2 py-0.5 rounded flex items-center gap-1 bg-[#0ad1ea]/5">
                      <TagIcon size={7} /> {activeTimer.projectName}
                    </span>
                    <span className="text-zinc-600 tracking-widest italic text-[7px]">SQUAD_SRL // STABLE_UPLINK</span>
                  </div>
                </div>
                <div className="text-[11px] tracking-tighter text-white/90 leading-none">
                  <LiveTimer startTime={activeTimer.startTime} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-m text-zinc-500 uppercase italic">AWAITING_SYNC</div>
                <div className="text-[10px] tracking-tighter text-[#08646E] leading-none">
                  {maxRate} <span className="text-sm opacity-50 font-normal">MBPS</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* NEURAL TRAFFIC CHART */}
        <div className="lg:col-span-2 p-8 border border-[#08646E]/10 bg-[#050505] rounded-3xl min-h-[350px]">
          <div className="flex justify-between items-center mb-8">
            <div className="text-[10px] text-[#08646E] uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Neural_Traffic</div>
            <div className="text-2xl text-white font-light tracking-tighter">{netData[netData.length-1]?.down || 0} <span className="text-[10px] text-[#08646E]">MBPS</span></div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData}>
                <defs>
                  <linearGradient id="colorCian" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ad1ea" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ad1ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="down" stroke="#0ad1ea" strokeWidth={1.5} fill="url(#colorCian)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TERMINAL RADAR */}
        <div className="p-8 border border-[#08646E]/10 bg-[#0a181d]/10 rounded-3xl flex flex-col min-h-[350px]">
          <div className="flex items-center gap-3 mb-6 text-[#08646E]">
            <Terminal size={18} />
            <div className="text-[8px] tracking-[0.3em] uppercase italic text-zinc-500">Radar_Terminal</div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {isLoadingClockify ? (
              <div className="text-[6px] opacity-20 italic">Scanning_Frequencies...</div>
            ) : (
              clockifyEntries.map((e: any) => {
                const isLive = !e.endTime;
                return (
                  <div key={e.id} className={`text-[10px] border-l-2 pl-3 py-2 transition-all rounded-r-lg ${isLive ? 'border-[#0ad1ea] bg-[#0ad1ea]/10' : 'border-[#08646E]/20 bg-black/40 opacity-40'}`}>
                    <div className="flex justify-between items-start mb-1 text-[6px]">
                      <span className={`${isLive ? "text-[#0ad1ea] animate-pulse font-bold" : "text-zinc-600"}`}>[{isLive ? "LIVE" : "OFFLINE"}]</span>
                      <span className="opacity-30 italic">{e.startTime ? new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                    </div>
                    <div className={`truncate uppercase ${isLive ? "text-white" : "text-zinc-500"}`}>{e.description}</div>
                    <div className="text-[6px] text-[#08646E] uppercase italic opacity-60">{e.projectName}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <button onClick={() => signOut()} className="mt-12 text-[9px] text-zinc-700 hover:text-[#0ad1ea] transition-colors uppercase tracking-[0.5em] italic">
        Terminate_Session // Disconnect_Core_Interface
      </button>
    </div>
  );
}