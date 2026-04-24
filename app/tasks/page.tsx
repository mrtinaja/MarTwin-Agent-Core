"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, X, Terminal, Search, Send, 
  LayoutGrid, CheckCircle2, Clock, Activity, ArrowRight,
  Cpu, ShieldAlert, Binary, Zap, Database
} from "lucide-react";

export default function TasksPage() {
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [filter, setFilter] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error("UPLINK_BROKEN:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    setMounted(true); 
    loadReports(); 
  }, []);

  const moveTask = async (taskId: string, newStatus: string) => {
    const task = reports.find(r => r.id === taskId);
    if (!task) return;
    
    const updatedTask = { ...task, status: newStatus };
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      });
      if (res.ok) {
        setReports(reports.map(r => r.id === taskId ? updatedTask : r));
        if (selectedTask?.id === taskId) setSelectedTask(updatedTask);
      }
    } catch (e) { console.error(e); }
  };

  // --- PALETA DE COLORES MARTWIN V5 ---
  // Cian: #088395 | Ámbar: #FFB000
  const columns = [
    { id: "backlog", title: "DATA_BACKLOG", icon: <Clock size={16}/>, color: "text-zinc-600", border: "border-zinc-800", bg: "bg-zinc-950", bar: "bg-zinc-800", glow: "" },
    { id: "testing", title: "QA_INJECTION", icon: <Activity size={16}/>, color: "text-[#088395]", border: "border-[#088395]/30", bg: "bg-[#088395]/5", bar: "bg-[#088395] shadow-[0_0_15px_#088395]", glow: "shadow-[0_0_20px_rgba(8,131,149,0.1)]" },
    { id: "done", title: "DECODED_OK", icon: <CheckCircle2 size={16}/>, color: "text-[#FFB000]", border: "border-[#FFB000]/30", bg: "bg-[#FFB000]/5", bar: "bg-[#FFB000] shadow-[0_0_15px_#FFB000]", glow: "shadow-[0_0_20px_rgba(255,176,0,0.1)]" }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020202] font-mono text-zinc-400 p-8 selection:bg-[#088395] selection:text-white relative overflow-hidden">
      {/* SCANLINES OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(8,131,149,0.06),rgba(255,176,0,0.02))] bg-[length:100%_2px,3px_100%] z-50"></div>

      <header className="mb-10 flex justify-between items-end border-b-2 border-[#088395]/20 pb-8 relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-[#088395] animate-pulse" />
            <span className="text-[10px] tracking-[0.5em] text-[#088395]/50 uppercase font-black">Neural Link Interface</span>
          </div>
          <h1 className="text-4xl text-white font-black italic tracking-tighter flex items-center gap-4 uppercase leading-none">
            MarTwin <span className="text-[#FFB000] not-italic font-thin drop-shadow-[0_0_10px_#FFB000]">SYS_BOARD</span>
          </h1>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-[#088395]/20 blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-[#088395]/50" size={14} />
            <input 
              type="text" placeholder="FILTER_BY_REPORT_ID..." 
              className="bg-black border border-[#088395]/20 rounded-none py-3 pl-12 pr-6 text-[10px] text-[#088395] outline-none focus:border-[#088395] w-80 transition-all font-bold placeholder:text-zinc-800"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="animate-spin text-[#088395]" size={40} />
          <span className="text-[10px] tracking-[0.4em] animate-pulse text-[#088395]">SYNCHRONIZING_CORE...</span>
        </div>
      ) : (
        <div className="flex gap-8 overflow-x-auto pb-6 h-[calc(100vh-220px)] custom-scrollbar">
          {columns.map(col => (
            <div key={col.id} className={`flex-shrink-0 w-96 flex flex-col bg-[#050505] border border-white/5 relative ${col.glow}`}>
              <div className={`p-6 border-b border-white/5 ${col.bg} flex justify-between items-center relative overflow-hidden`}>
                <div className="flex items-center gap-4 relative z-10">
                  <span className={`${col.color} drop-shadow-[0_0_5px_currentColor]`}>{col.icon}</span>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">{col.title}</h2>
                </div>
                <div className="bg-black border border-white/10 px-3 py-1 rounded-none text-[10px] font-black text-[#088395] z-10">
                  {reports.filter(r => (r.status || 'backlog') === col.id).length}
                </div>
                <div className={`absolute top-0 left-0 w-full h-[2px] ${col.bar}`} />
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
                {reports
                  .filter(r => (r.status || 'backlog') === col.id)
                  .filter(r => (r.title || r.id)?.toLowerCase().includes(filter.toLowerCase()))
                  .map(report => (
                    <div 
                      key={report.id}
                      onClick={() => setSelectedTask(report)}
                      className="group bg-black border border-white/5 p-6 rounded-none hover:border-[#088395]/50 transition-all cursor-pointer relative overflow-hidden shadow-2xl"
                    >
                      <div className={`absolute left-0 top-0 h-full w-[2px] ${col.bar} opacity-50 group-hover:opacity-100 transition-opacity`} />
                      
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[14px] font-black text-zinc-100 tracking-tighter uppercase italic group-hover:text-[#088395] transition-colors flex items-center gap-2">
                          <Binary size={12} className="opacity-30" />
                          {report.title || report.id}
                        </span>
                        <div className={`h-2 w-2 ${col.id === 'done' ? 'bg-[#FFB000]' : 'bg-[#088395]'} animate-pulse rounded-full shadow-[0_0_8px_currentColor]`}></div>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                         <div className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 text-zinc-500 font-bold uppercase tracking-widest">
                           {report.area || "Z_S_CORE"}
                         </div>
                      </div>

                      <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const next = col.id === 'backlog' ? 'testing' : col.id === 'testing' ? 'done' : 'testing';
                            moveTask(report.id, next);
                          }} 
                          className={`text-[9px] px-5 py-2 font-black uppercase tracking-tighter flex items-center gap-3 transition-all rounded-none ${
                            col.id === 'done' 
                            ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' 
                            : 'bg-transparent border-2 border-[#088395] text-[#088395] hover:bg-[#088395] hover:text-black'
                          }`}
                        >
                          {col.id === 'backlog' ? 'INIT_PROT' : col.id === 'testing' ? 'VALIDATE' : 'RE_TEST'}
                          <Zap size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: DETAIL INTERFACE (ÁMBAR & CIAN) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTask(null)}></div>
          
          <div className="relative bg-[#050505] border-2 border-[#088395]/30 w-full max-w-2xl p-10 shadow-[0_0_50px_rgba(8,131,149,0.15)] animate-in fade-in zoom-in duration-300 rounded-none">
            <div className="absolute top-0 right-0 w-24 h-2 text-[8px] bg-[#FFB000] flex items-center justify-center text-black font-black uppercase tracking-[0.5em]">Audit_Log</div>
            
            <button onClick={() => setSelectedTask(null)} className="absolute top-6 right-6 text-zinc-600 hover:text-[#FFB000] transition-colors">
              <X size={24} />
            </button>
             
            <div className="flex items-center gap-4 mb-8">
              <Database size={20} className="text-[#088395]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#088395] font-black uppercase tracking-[0.5em]">Z_S_Protocol_Archive</span>
                <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">SEQ_{selectedTask.id}</span>
              </div>
            </div>

            <h2 className="text-6xl text-white font-black italic uppercase tracking-tighter mb-6 leading-[0.8] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {selectedTask.title || selectedTask.id}
            </h2>
            
            <p className="text-[12px] text-zinc-400 italic mb-10 leading-relaxed max-w-lg border-l-2 border-[#FFB000]/20 pl-6">
              {selectedTask.desc || "// RECONSTRUCTING_LEGACY_LOGIC..."}
            </p>
             
            <div className="space-y-8">
              <div className="p-6 bg-black border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-3 text-[#FFB000] mb-4 uppercase text-[10px] font-black tracking-widest relative z-10">
                  <Terminal size={14} /> Squad_Audit_Notes
                </div>
                <p className="text-zinc-300 text-[13px] font-medium italic leading-relaxed relative z-10">
                  {selectedTask.comments || "// NO_COMMENTS_IN_MEMORY_STREAM"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {columns.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => moveTask(selectedTask.id, c.id)}
                    className={`py-4 border-2 text-[10px] font-black uppercase tracking-tighter transition-all rounded-none ${
                      selectedTask.status === c.id 
                      ? 'bg-[#088395] text-black border-[#088395] shadow-[0_0_20px_#088395]' 
                      : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-[#088395] hover:text-white'
                    }`}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setSelectedTask(null)} 
              className="w-full mt-10 py-5 bg-[#FFB000] text-black font-black text-[12px] uppercase rounded-none tracking-[0.8em] hover:bg-white transition-all"
            >
              DISCONNECT_SESSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}