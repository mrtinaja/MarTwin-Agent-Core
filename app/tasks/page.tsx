"use client";
import { useState, useEffect, useCallback } from "react";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Loader2, 
  ChevronRight,
  ListTodo,
  Zap,
  X,
  Terminal
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  category: "MIGRACION" | "TESTING" | "CRM" | "SQUAD";
  priority: "ALTA" | "NORMAL" | "CRITICA";
  completed: boolean;
  metadata?: any; 
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInjectModalOpen, setIsInjectModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  
  const [newTask, setNewTask] = useState({ 
    title: "", 
    category: "SQUAD" as any, 
    priority: "NORMAL" as any 
  });

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'CRITICA': return 'border-red-900 text-red-500 bg-red-500/10';
      case 'ALTA': return 'border-yellow-700 text-yellow-500 bg-yellow-500/10';
      case 'NORMAL': return 'border-emerald-900 text-emerald-500 bg-emerald-500/10';
      default: return 'border-[#08646E]/20 text-[#08646E]/60';
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("FALLA_LECTURA_NUCLEO:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const syncWithIA = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/ai/sync-tasks', { method: 'POST' });
      if (res.ok) await fetchTasks();
    } catch (err) {
      console.error("FALLA_SYNC_IA:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInjectJson = async () => {
    if (!jsonInput.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ai/inject-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonText: jsonInput }),
      });

      if (res.ok) {
        setJsonInput("");
        setIsInjectModalOpen(false);
        await syncWithIA(); // Sincroniza automáticamente tras inyectar
      } else {
        alert("Error: El formato JSON no es válido o faltan campos obligatorios.");
      }
    } catch (err) {
      console.error("FALLA_INYECCION:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewTask({ title: "", category: "SQUAD", priority: "NORMAL" });
        await fetchTasks();
      }
    } catch (err) {
      console.error("FALLA_CREACION_MANUAL:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="p-10 bg-[#020202] min-h-screen font-mono text-zinc-400">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex justify-between items-center border-b border-[#08646E]/20 pb-8">
          <div>
            <h1 className="text-3xl text-white uppercase italic tracking-tighter flex items-center gap-4">
              <ListTodo size={32} className="text-[#08646E]" /> 
              PLANES DE <span className="text-[#08646E] font-bold">EJECUCIÓN</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] mt-2 text-[#08646E]/60">SQUAD ALPHA // OPERACIONES_CENTRALES</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsInjectModalOpen(true)}
              className="border border-emerald-900 text-emerald-500 hover:bg-emerald-500/10 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Terminal size={14} /> Inyectar JSON
            </button>
            <button 
              onClick={syncWithIA}
              disabled={isSyncing}
              className="border border-[#08646E] text-[#08646E] hover:bg-[#08646E]/10 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-30"
            >
              {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="fill-[#08646E]" />} 
              Sync IA
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#08646E] hover:bg-cyan-600 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(8,100,110,0.2)]"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#08646E] opacity-50" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`p-5 border ${task.completed ? 'border-zinc-900 bg-zinc-900/10' : 'border-[#08646E]/10 bg-[#050505]'} rounded-2xl flex items-center justify-between cursor-pointer group transition-all hover:border-[#08646E]/40`}
              >
                <div className="flex items-center gap-5">
                  <div onClick={(e) => { e.stopPropagation(); toggleTask(task); }}>
                    {task.completed ? <CheckSquare className="text-zinc-800" /> : <Square className="text-[#08646E] group-hover:scale-110 transition-transform" />}
                  </div>
                  <div>
                    <span className={`text-[8px] px-2 py-0.5 rounded border ${getPriorityStyles(task.priority)} font-bold uppercase mb-1 inline-block`}>
                      {task.category} // {
                        task.priority === 'CRITICA' ? 'ALTA (32h)' : 
                        task.priority === 'ALTA' ? 'MEDIA (24h)' : 
                        'BAJA (17h)'
                      }
                    </span>
                    <h3 className={`text-sm ${task.completed ? 'text-zinc-700 line-through' : 'text-zinc-200'} uppercase font-light tracking-tight`}>
                      {task.title}
                    </h3>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#08646E] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL INYECTOR JSON */}
      {isInjectModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-[#050505] border border-[#08646E]/30 w-full max-w-2xl rounded-[40px] p-10 relative shadow-2xl">
            <button onClick={() => setIsInjectModalOpen(false)} className="absolute top-8 right-8 text-zinc-600 hover:text-white"><X size={20} /></button>
            <h2 className="text-[#08646E] text-[10px] uppercase font-bold tracking-[0.3em] mb-6 flex items-center gap-2">
              <Terminal size={14} /> Terminal de Inyección de Logs
            </h2>
            <textarea 
              className="w-full h-80 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 text-emerald-500 font-mono text-[10px] outline-none focus:border-emerald-500/50 mb-6 resize-none"
              placeholder="PEGÁ EL JSON GENERADO POR MAR-TWIN ACÁ..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsInjectModalOpen(false)} className="flex-1 py-4 text-zinc-500 text-[10px] uppercase font-bold">Cancelar</button>
              <button 
                onClick={handleInjectJson} 
                disabled={isSubmitting}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-full text-[10px] uppercase font-bold shadow-[0_0_20px_rgba(5,150,105,0.3)] disabled:opacity-50"
              >
                {isSubmitting ? "Procesando..." : "Inyectar y Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-[#050505] border border-[#08646E]/30 w-full max-w-xl rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#08646E]"></div>
            <button onClick={() => setSelectedTask(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-white"><X size={20} /></button>
            <span className={`text-[9px] px-3 py-1 rounded-full border ${getPriorityStyles(selectedTask.priority)} font-bold uppercase mb-6 inline-block`}>
              {selectedTask.category} // PRIORIDAD_{selectedTask.priority}
            </span>
            <h2 className="text-3xl text-white uppercase italic font-bold mb-8 leading-none">{selectedTask.title}</h2>
            <div className="space-y-6 text-zinc-400 font-mono text-[11px] leading-relaxed">
              <div className="p-5 bg-zinc-900/40 border-l-2 border-[#08646E] rounded-r-2xl">
                <p className="text-[#08646E] font-bold mb-2 uppercase text-[9px]">Análisis Squad Alpha</p>
                <p>{selectedTask.metadata?.analysis?.context || "Análisis técnico de ingeniería inversa finalizado."}</p>
              </div>
              {selectedTask.metadata?.quotation && (
                <div className="grid grid-cols-3 gap-2 border-t border-[#08646E]/20 pt-6">
                  <div className="bg-zinc-900 p-3 rounded-lg text-center">
                    <p className="text-[8px] text-zinc-500 uppercase">Dev</p>
                    <p className="text-white font-bold">{selectedTask.metadata.quotation.hours.development}h</p>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg text-center border border-yellow-900/30">
                    <p className="text-[8px] text-yellow-600 uppercase">QA</p>
                    <p className="text-yellow-500 font-bold">{selectedTask.metadata.quotation.hours.qa}h</p>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg text-center border border-emerald-900/30">
                    <p className="text-[8px] text-emerald-600 uppercase">Total</p>
                    <p className="text-emerald-500 font-bold">{selectedTask.metadata.quotation.hours.total}h</p>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => { toggleTask(selectedTask); setSelectedTask(null); }}
              className="w-full mt-10 py-5 bg-[#08646E] text-white rounded-full text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-cyan-600 transition-all"
            >
              {selectedTask.completed ? "Reabrir Operación" : "Marcar como Completada"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL NUEVO MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-[#08646E]/30 w-full max-w-md rounded-[32px] p-10 shadow-2xl">
            <h2 className="text-[#08646E] text-[10px] uppercase font-bold tracking-[0.3em] mb-8">Definir Operación</h2>
            <div className="space-y-6">
              <input 
                type="text" 
                placeholder="EJ: MIGRACION_REPORTES" 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none uppercase text-[11px] focus:border-[#08646E]"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-zinc-500 text-[10px] uppercase font-bold">Cancelar</button>
                <button onClick={addTask} disabled={isSubmitting} className="flex-[2] py-4 bg-[#08646E] text-white rounded-full text-[10px] uppercase font-bold">
                  {isSubmitting ? "Cargando..." : "Iniciar Protocolo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}