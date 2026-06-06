import React, { useState, useEffect } from 'react';
import { Clock, Zap, AlertCircle, Loader2 } from 'lucide-react';

export const AgentDashboard = () => {
  const [clockifyData, setClockifyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const syncClockify = async () => {
      try {
        const res = await fetch('/api/clockify/entries?wId=5bd5bc8cb079871a22a73b6b');
        if (!res.ok) throw new Error('Status_' + res.status);

        const data = await res.json();
        setClockifyData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("CLOCKIFY_SYNC_FAIL:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    syncClockify();
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <aside className="w-64 border-r border-slate-800 p-4 hidden md:flex flex-col">
        <h2 className="text-xs font-normal text-slate-500 uppercase tracking-widest mb-4">Proyectos</h2>
        <ul className="space-y-2 text-sm flex-1">
          <li className="p-2 bg-blue-900/20 text-blue-400 rounded border border-blue-800/50 flex justify-between">
            <span>IT Workspace</span>
            <span className="text-[10px] opacity-70">Activo</span>
          </li>
          <li className="p-2 hover:bg-slate-800 rounded cursor-pointer transition">Proyecto tecnico general</li>
        </ul>

        <div className="mt-auto border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <span className="text-[10px] font-normal uppercase tracking-tighter text-slate-400">Live Tracker</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-[10px] text-slate-600 animate-pulse italic">
              <Loader2 size={10} className="animate-spin" /> Sincronizando...
            </div>
          ) : error ? (
            <div className="text-[9px] text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center gap-1">
              <AlertCircle size={10} /> Link Off: 404
            </div>
          ) : clockifyData.length === 0 ? (
            <p className="text-[10px] text-slate-600 italic">No hay tracks activos.</p>
          ) : (
            <div className="space-y-2">
              {clockifyData.slice(0, 1).map(track => (
                <div key={track.id} className="bg-slate-900 border border-slate-800 p-2 rounded relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${!track.timeInterval.end ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                  <p className="text-[10px] font-normal truncate pr-4">{track.description || 'Sin descripcion'}</p>
                  <p className="text-[8px] text-slate-500 uppercase">{track.project?.name || 'Workspace'}</p>
                  {!track.timeInterval.end && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-950/50 backdrop-blur-sm z-10">
          <span className="font-normal text-xl tracking-tight">Martin<span className="text-blue-500">AI</span>_Agent</span>
          <div className="flex gap-4">
            <div className="flex flex-col items-end justify-center">
              <span className="text-[8px] text-slate-500 uppercase font-normal">Daily_Burn_Rate</span>
              <span className="text-xs font-mono text-green-500">{loading ? '--' : '34:41h'}</span>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-500 font-normal uppercase">Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
          <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-800 p-4 rounded-lg shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-yellow-500 fill-yellow-500" />
              <p className="text-blue-400 font-normal text-[10px] uppercase tracking-widest italic">Contexto detectado: Desarrollo IT</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              Martin, hay un item tecnico activo con posible impacto en backend, datos o QA.
              Podemos revisar codigo, logs, documentacion o criterios de validacion.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-950">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <input
              type="text"
              placeholder="Preguntale a tu agente..."
              className="relative w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-2xl text-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
              CTRL + K
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
