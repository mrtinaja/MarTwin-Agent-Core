"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
// IMPORTANTE: Aquí están todos los iconos necesarios
import { 
  Loader2, 
  HardDrive, 
  Calendar, 
  Activity, 
  Zap, 
  Wifi, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({ drive: 0, events: [] as any[] });
  const [ping, setPing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [netData, setNetData] = useState<any[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRealData();
      
      // Inicializar datos del gráfico (30 puntos para suavidad)
      const initialData = Array.from({ length: 30 }, (_, i) => ({
        name: i,
        down: Math.floor(Math.random() * 30) + 10,
        up: Math.floor(Math.random() * 15) + 5
      }));
      setNetData(initialData);

      // Intervalo de actualización del gráfico (Dinamismo puro)
      const interval = setInterval(() => {
        setNetData(prev => {
          const lastDown = prev[prev.length - 1].down;
          // Fluctuación realista de red
          const nextDown = Math.max(10, Math.min(100, lastDown + (Math.random() * 40 - 20)));
          return [...prev.slice(1), { 
            name: Date.now(), 
            down: Math.floor(nextDown), 
            up: Math.floor(nextDown * 0.4) 
          }];
        });
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [status]);

  async function fetchRealData() {
    const startTime = Date.now();
    try {
      setLoading(true);
      const [resDrive, resCalendar] = await Promise.all([
        fetch(`/api/drive/count?t=${startTime}`).then(res => res.ok ? res.json() : { total: 0 }),
        fetch(`/api/calendar/today?t=${startTime}`).then(res => res.ok ? res.json() : { events: [] }),
      ]);

      setPing(Date.now() - startTime);
      setStats({
        drive: Number(resDrive.total) || 0,
        events: resCalendar.events || [], 
      });
    } catch (err) {
      console.error("❌ Telemetry Error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return (
    <div className="flex items-center justify-center min-h-screen bg-[#020202]">
      <Loader2 className="text-[#08646E] animate-spin" size={48} />
    </div>
  );

  if (status === "unauthenticated") return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020202] font-mono">
      <div className="text-[#08646E] text-xl mb-6 tracking-[0.3em] uppercase italic">NÚCLEO BLOQUEADO</div>
      <button onClick={() => signIn("google")} className="border border-[#08646E] text-[#08646E] px-8 py-3 hover:bg-[#08646E]/20 transition-all uppercase text-xs">
        Iniciar Protocolo de Enlace
      </button>
    </div>
  );

  return (
    <div className="p-12 min-h-screen bg-[#020202] text-zinc-300 font-mono font-extralight">
      <header className="mb-16">
        <div className="text-5xl tracking-tighter text-[#08646E] uppercase italic mb-4">
          MARTWIN <span className="text-white font-normal uppercase">Systems</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[1px] w-20 bg-[#08646E]" />
          <div className="text-[#08646E]/60 text-[10px] tracking-[0.5em] uppercase italic flex items-center gap-2">
            <div className={`h-1 w-1 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-[#08646E] animate-ping'}`} />
            OPERADOR: {session?.user?.name?.toUpperCase()} // LINK: {ping && ping > 500 ? 'UNSTABLE' : 'STABLE'}
          </div>
        </div>
      </header>

      {/* GRID SUPERIOR: LATENCIA Y NUBE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="p-8 border border-[#08646E]/30 bg-[#08646E]/5 rounded-3xl relative overflow-hidden group transition-all hover:border-[#08646E]/60">
          <Activity size={16} className="absolute top-4 right-4 text-[#08646E] animate-pulse" />
          <Zap className="text-white mb-4" size={20} />
          <div className="text-[10px] tracking-[0.3em] text-zinc-500 mb-2 uppercase italic">Latencia Neural</div>
          <div className="text-5xl text-white font-bold tracking-tighter">{ping ? `${ping}ms` : "---"}</div>
        </div>

        <div className="p-8 border border-white/5 bg-[#0a181d]/20 rounded-3xl group transition-all hover:border-[#08646E]/30">
          <HardDrive className="text-[#08646E] mb-4" size={20} />
          <div className="text-[10px] tracking-[0.3em] text-zinc-500 mb-2 uppercase italic">Nube Squad</div>
          <div className="text-5xl text-white font-light tracking-tighter">{stats.drive}</div>
        </div>
      </div>

      {/* SECCIÓN INTERMEDIA: GRÁFICO (2/3) + AGENDA (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* GRÁFICO WIFI */}
        <div className="lg:col-span-2 p-8 border border-[#08646E]/20 bg-[#050505] rounded-3xl relative overflow-hidden group min-h-[350px]">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#08646E]/10 rounded-lg">
                <Wifi size={18} className="text-[#08646E] animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] tracking-[0.3em] text-[#08646E] uppercase font-bold italic">Red Global</div>
                <div className="text-[8px] text-zinc-600 uppercase">Traffic monitoring: ACTIVE</div>
              </div>
            </div>
            
            <div className="flex gap-8">
              <div className="text-right">
                <div className="flex items-center gap-2 text-[#08646E] text-[9px] uppercase font-bold justify-end italic">
                  <ArrowDown size={8} /> Down
                </div>
                <div className="text-2xl text-white font-extralight tracking-tighter">
                  {netData[netData.length - 1]?.down || 0} <span className="text-[9px] text-zinc-600">MBPS</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-cyan-400 text-[9px] uppercase font-bold justify-end italic">
                  <ArrowUp size={8} /> Up
                </div>
                <div className="text-2xl text-white font-extralight tracking-tighter">
                  {netData[netData.length - 1]?.up || 0} <span className="text-[9px] text-zinc-600">MBPS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData}>
                <defs>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#08646E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#08646E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020202', border: '1px solid #08646E40', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#08646E' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="down" 
                  stroke="#08646E" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDown)" 
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="up" 
                  stroke="#22d3ee" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#08646E 1px, transparent 1px), linear-gradient(90deg, #08646E 1px, transparent 1px)', backgroundSize: '25px 25px' }} 
          />
        </div>

        {/* AGENDA LIMPIA */}
        <div className="p-8 border border-white/5 bg-[#0a181d]/20 rounded-3xl flex flex-col group min-h-[350px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="text-[#08646E]" size={18} />
              <div className="text-[10px] tracking-[0.3em] text-[#08646E] uppercase font-bold italic">Agenda Hoy</div>
            </div>
            <div className="text-[8px] text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded-md">
              {stats.events.length > 0 ? 'Sync: Activo' : 'Standby'}
            </div>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[220px]">
            {stats.events.length > 0 ? (
              stats.events.map((ev: any, i: number) => (
                <div key={i} className="group/item border-l-2 border-[#08646E]/20 hover:border-[#22d3ee] pl-4 py-2 transition-all bg-white/[0.01] rounded-r-lg">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[8px] text-[#08646E] font-bold tracking-widest uppercase">
                      {ev.start_time ? new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Todo el día'}
                    </div>
                  </div>
                  <div className="text-[11px] text-white font-light uppercase leading-tight">
                    {ev.event_title}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col justify-center items-center opacity-20 italic text-[10px] uppercase tracking-widest text-center">
                Sin eventos <br/> activos
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 opacity-40">
            <div className="text-[7px] uppercase tracking-[0.2em]">MarTwin Neural Interface v3.2</div>
          </div>
        </div>

      </div>

      <button onClick={() => signOut()} className="mt-12 text-[9px] text-zinc-700 hover:text-red-900 transition-colors uppercase tracking-[0.5em] italic">
        Terminar Sesión
      </button>
    </div>
  );
}