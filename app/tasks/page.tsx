"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, X, Terminal, Search, Send, 
  LayoutGrid, CheckCircle2, Clock, Activity, ArrowRight,
  Cpu, ShieldAlert, Binary, Zap, Database, Kanban, Filter, Plus
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

  // --- CONFIGURACIÓN DE COLUMNAS CORPORATIVAS ---
  const columns = [
    { id: "backlog", title: "Pendientes", icon: <Clock size={16}/>, color: "text-gray-400", bar: "bg-gray-200" },
    { id: "testing", title: "En Proceso", icon: <Activity size={16}/>, color: "text-[#1e1248]", bar: "bg-[#1e1248]" },
    { id: "done", title: "Finalizado", icon: <CheckCircle2 size={16}/>, color: "text-[#e50051]", bar: "bg-[#e50051]" }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-[#1e1248] p-8 selection:bg-[#e50051]/10 selection:text-[#e50051]">
      
      {/* HEADER CORPORATIVO */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#1e1248]/5 rounded-lg text-[#1e1248]">
              <Kanban size={18} />
            </div>
            <span className="text-[10px] font-normal tracking-widest text-gray-400 uppercase">Gestión de Operaciones</span>
          </div>
          <h1 className="text-3xl text-[#1e1248] font-normal tracking-tighter uppercase leading-none">
            Panel de <span className="text-[#e50051]">Proyectos</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" placeholder="Filtrar por ID o título..." 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-6 text-xs font-normal focus:outline-none focus:border-[#1e1248]/20 transition-all placeholder:text-gray-300"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="p-3 bg-[#1e1248] text-white rounded-2xl shadow-lg shadow-[#1e1248]/20 hover:bg-[#e50051] transition-all">
            <Plus size={20} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="animate-spin text-[#e50051]" size={40} />
          <span className="text-[10px] font-normal tracking-widest text-gray-300 uppercase animate-pulse">Sincronizando Tablero...</span>
        </div>
      ) : (
        <div className="flex gap-8 overflow-x-auto pb-10 h-[calc(100vh-250px)] custom-scrollbar">
          {columns.map(col => (
            <div key={col.id} className="flex-shrink-0 w-96 flex flex-col bg-transparent">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm ${col.color}`}>
                    {col.icon}
                  </div>
                  <h2 className="text-sm font-normal uppercase tracking-tight text-[#1e1248]">{col.title}</h2>
                </div>
                <span className="bg-[#1e1248] text-white text-[10px] font-normal px-3 py-1 rounded-full">
                  {reports.filter(r => (r.status || 'backlog') === col.id).length}
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {reports
                  .filter(r => (r.status || 'backlog') === col.id)
                  .filter(r => (r.title || r.id)?.toLowerCase().includes(filter.toLowerCase()))
                  .map(report => (
                    <div 
                      key={report.id}
                      onClick={() => setSelectedTask(report)}
                      className="group bg-white border border-gray-100 p-6 rounded-[1.5rem] hover:shadow-2xl hover:shadow-[#1e1248]/5 transition-all cursor-pointer relative shadow-sm border-l-4"
                      style={{ borderLeftColor: col.id === 'done' ? '#e50051' : col.id === 'testing' ? '#1e1248' : '#e2e8f0' }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-normal text-[#1e1248] tracking-tight uppercase group-hover:text-[#e50051] transition-colors leading-tight">
                          {report.title || report.id}
                        </span>
                        <span className="text-[9px] font-normal text-gray-300 bg-gray-50 px-2 py-0.5 rounded uppercase">
                          ID: {report.id.slice(0,5)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-normal uppercase">
                          <Database size={12} /> {report.area || "General"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-normal uppercase">
                          <Clock size={12} /> 24h
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                         <div className="flex -space-x-2">
                           <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-normal">MT</div>
                           <div className="w-6 h-6 rounded-full bg-[#1e1248] border-2 border-white flex items-center justify-center text-[8px] font-normal text-white">S</div>
                         </div>
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const next = col.id === 'backlog' ? 'testing' : col.id === 'testing' ? 'done' : 'testing';
                            moveTask(report.id, next);
                          }} 
                          className={`text-[9px] px-4 py-2 font-normal uppercase tracking-widest transition-all rounded-xl border flex items-center gap-2 ${
                            col.id === 'done' 
                            ? 'bg-gray-50 text-gray-400 border-gray-100' 
                            : 'bg-white border-gray-100 text-[#1e1248] hover:bg-[#1e1248] hover:text-white hover:border-[#1e1248]'
                          }`}
                        >
                          {col.id === 'backlog' ? 'Iniciar' : col.id === 'testing' ? 'Finalizar' : 'Re-abrir'}
                          <Zap size={10} className={col.id === 'done' ? 'opacity-30' : 'text-[#e50051]'} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DETALLE CORPORATIVO */}
      {selectedTask && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-[#1e1248]/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-white border border-gray-100 w-full max-w-2xl p-10 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#e50051]" />
            
            <button onClick={() => setSelectedTask(null)} className="absolute top-8 right-8 text-gray-300 hover:text-[#e50051] transition-colors">
              <X size={24} />
            </button>
             
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#1e1248] text-white rounded-2xl">
                <Database size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-normal uppercase tracking-[0.3em]">Detalle de Tarea</span>
                <span className="text-xs text-[#1e1248] font-normal uppercase tracking-widest">ID: {selectedTask.id}</span>
              </div>
            </div>

            <h2 className="text-4xl text-[#1e1248] font-normal uppercase tracking-tighter mb-6 leading-tight">
              {selectedTask.title || selectedTask.id}
            </h2>
            
            <p className="text-sm text-gray-500 mb-10 leading-relaxed border-l-4 border-gray-100 pl-6">
              {selectedTask.desc || "No hay una descripción detallada para este activo."}
            </p>
             
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-[#e50051] mb-4 uppercase text-[10px] font-normal tracking-widest">
                  <Terminal size={14} /> Notas Tecnicas
                </div>
                <p className="text-[#1e1248]/70 text-xs font-normal leading-relaxed italic">
                  {selectedTask.comments || "Sin notas tecnicas registradas todavia."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {columns.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => moveTask(selectedTask.id, c.id)}
                    className={`py-4 rounded-xl border text-[9px] font-normal uppercase tracking-widest transition-all ${
                      selectedTask.status === c.id 
                      ? 'bg-[#1e1248] text-white border-[#1e1248] shadow-lg shadow-[#1e1248]/20' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-[#1e1248] hover:text-[#1e1248]'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setSelectedTask(null)} 
              className="w-full mt-10 py-5 bg-[#e50051] text-white font-normal text-xs uppercase rounded-2xl tracking-[0.3em] hover:bg-[#c40045] transition-all shadow-xl shadow-[#e50051]/20"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e124810; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5005120; }
      `}</style>
    </div>
  );
}
