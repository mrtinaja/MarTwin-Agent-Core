"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Loader2, 
  Plus, 
  X, 
  Trash2, 
  Save, 
  ChevronRight,
  Database,
  ShieldCheck,
  Terminal,
  Zap
} from "lucide-react";

export default function CalendarPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false); // Control de hidratación global
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [range, setRange] = useState('month'); 
  const [time, setTime] = useState(""); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [formData, setFormData] = useState({ 
    title: "", 
    description: "",
    startTime: "09:00",
    endTime: "10:00"
  });

  // Aseguramos que el componente solo se rinda en el cliente tras el montaje
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-AR', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCalendar = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar/today?range=month`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Error cargando agenda:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (mounted) fetchCalendar();
  }, [fetchCalendar, mounted]);

  // Si no está montado, retornamos un placeholder vacío con el mismo fondo
  // Esto evita que el servidor y el cliente comparen estructuras distintas
  if (!mounted) return <div className="p-12 min-h-screen bg-[#020202]" />;

  const filteredEvents = events.filter((event: any) => {
    const eventStart = event.start?.dateTime || event.start?.date;
    if (!eventStart) return false;
    const eventDate = new Date(eventStart);
    const now = new Date();

    if (range === 'today') return eventDate.toDateString() === now.toDateString();
    if (range === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    }
    return true; 
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData({ title: "", description: "", startTime: "09:00", endTime: "10:00" });
    setSelectedDate("");
    setIsSubmitting(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSubmitting(true);
    const baseDate = selectedDate || (editingEvent 
      ? (editingEvent.start.dateTime || editingEvent.start.date).split('T')[0] 
      : new Date().toISOString().split('T')[0]);
    const startDateTime = `${baseDate}T${formData.startTime}:00`;
    const endDateTime = `${baseDate}T${formData.endTime}:00`;

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent?.id || null,
          summary: formData.title.toUpperCase(),
          description: formData.description,
          start: startDateTime,
          end: endDateTime,
        }),
      });
      if (res.ok) { closeModal(); fetchCalendar(); }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/calendar/events?id=${editingEvent.id}`, { method: 'DELETE' });
      if (res.ok) { closeModal(); fetchCalendar(); }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, i) => i - offset + 1);

  return (
    <div className="p-12 min-h-screen bg-[#020202] text-zinc-400 font-mono font-extralight select-none">
      
      {/* HEADER CORREGIDO - Estructura plana para evitar Hydration Error */}
      <header className="mb-12 flex justify-between items-start">
        <section>
          <h1 className="text-4xl tracking-tighter text-[#0ad1ea] uppercase italic mb-2 shadow-[0_0_15px_rgba(10,209,234,0.3)]">
            SQUAD <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">AGENDA_LOG</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 bg-[#0ad1ea] animate-pulse inline-block" />
            <span className="text-[10px] tracking-[0.5em] text-[#08646E] uppercase italic">Temporal_Sequence_Monitor_v4.2</span>
          </div>
        </section>
        
        <nav className="flex bg-[#050505] border border-white/5 p-1 rounded-none">
          {['today', 'week', 'month'].map((r) => (
            <button 
              key={r} 
              onClick={() => setRange(r)} 
              className={`px-6 py-2 text-[10px] uppercase tracking-widest transition-all ${range === r ? 'bg-[#0ad1ea]/10 text-[#0ad1ea] border border-[#0ad1ea]/30 shadow-[0_0_10px_rgba(10,209,234,0.2)]' : 'text-zinc-700 hover:text-zinc-400'}`}
            >
              {r}
            </button>
          ))}
        </nav>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#0ad1ea] mb-4" size={32} />
          <p className="text-[10px] tracking-[0.8em] text-[#08646E] uppercase">Accessing_Temporal_Logs...</p>
        </div>
      ) : range === 'month' ? (
        <div className="grid grid-cols-7 border border-white/5 bg-[#050505]/20">
          {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
            <div key={d} className="bg-[#050505] p-4 text-center text-[10px] text-[#08646E] font-bold uppercase tracking-[0.3em] border-b border-white/5">{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = day > 0 && day <= daysInMonth;
            const isToday = isCurrentMonth && day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
            const cellDate = new Date(currentYear, currentMonth, day);
            const dateStr = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, '0') + "-" + String(cellDate.getDate()).padStart(2, '0');
            const dayEvents = events.filter((e: any) => (e.start?.dateTime || e.start?.date || "").includes(dateStr));

            return (
              <div 
                key={idx} 
                className={`min-h-[130px] p-3 bg-[#020202] border-white/5 border-r border-b relative group transition-all ${
                  !isCurrentMonth ? 'opacity-5' : 'hover:bg-[#0ad1ea]/5'
                } ${isToday ? 'bg-[#0ad1ea]/5 border-[#0ad1ea]/20' : ''}`}
              >
                {isCurrentMonth && (
                  <>
                    <span className={`text-[11px] font-bold ${isToday ? 'text-[#0ad1ea] drop-shadow-[0_0_8px_#0ad1ea]' : 'text-zinc-800'}`}>
                      {String(day).padStart(2, '0')}
                    </span>
                    <button onClick={() => { setSelectedDate(dateStr); setIsModalOpen(true); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[#0ad1ea] transition-all hover:scale-125">
                      <Plus size={14} />
                    </button>
                    <div className="mt-3 space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                      {dayEvents.map((e: any) => (
                        <div 
                          key={e.id} 
                          onClick={() => { 
                            const start = new Date(e.start?.dateTime || e.start?.date);
                            const end = new Date(e.end?.dateTime || e.end?.date);
                            setEditingEvent(e); 
                            setFormData({ title: e.summary, description: e.description || "", startTime: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), endTime: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }); 
                            setIsModalOpen(true); 
                          }} 
                          className="text-[8px] bg-black border-l-2 border-[#0ad1ea]/40 text-zinc-400 p-1.5 truncate cursor-pointer hover:border-[#0ad1ea] hover:bg-[#0ad1ea]/10 hover:text-white transition-all uppercase tracking-tighter"
                        >
                          {e.summary}
                        </div>
                      ))}
                    </div>
                    {isToday && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0ad1ea] shadow-[0_0_10px_#0ad1ea]" />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true); }} className="w-full p-5 border border-dashed border-[#0ad1ea]/20 bg-[#0ad1ea]/5 text-[#0ad1ea] text-[10px] uppercase tracking-[0.4em] font-bold hover:bg-[#0ad1ea]/10 transition-all mb-12 flex items-center justify-center gap-3">
            <Plus size={16} /> INITIALIZE_NEW_PROTOCOL
          </button>
          {filteredEvents.map((event) => (
            <div key={event.id} onClick={() => { 
                const start = new Date(event.start?.dateTime || event.start?.date);
                const end = new Date(event.end?.dateTime || event.end?.date);
                setEditingEvent(event); 
                setFormData({ title: event.summary, description: event.description || "", startTime: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), endTime: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }); 
                setIsModalOpen(true); 
              }} 
              className="group p-6 border border-white/5 bg-[#050505] hover:border-[#0ad1ea]/30 transition-all flex items-center justify-between cursor-pointer relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#08646E]/30 group-hover:bg-[#0ad1ea] transition-all" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-[#0ad1ea] text-[9px] font-bold uppercase tracking-widest">
                  <Clock size={12} className="opacity-50" /> 
                  <span>{event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "ALL_DAY"}</span>
                  <span className="text-zinc-500 italic">{new Date(event.start?.dateTime || event.start?.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                </div>
                <h3 className="text-lg text-white uppercase font-bold tracking-tighter transition-colors group-hover:text-[#0ad1ea]">{event.summary}</h3>
              </div>
              <ChevronRight className="text-zinc-800 group-hover:text-[#0ad1ea] transition-all group-hover:translate-x-1" size={20} />
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-[#0ad1ea]/30 w-full max-w-md p-10 relative shadow-[0_0_60px_rgba(10,209,234,0.1)]">
            <div className="absolute top-0 left-0 w-2 h-2 bg-[#0ad1ea]" />
            <div className="flex justify-between items-center mb-10">
              <section>
                <h2 className="text-[#0ad1ea] text-[11px] uppercase font-bold tracking-[.4em] flex items-center gap-2">
                  <Terminal size={14} /> {editingEvent ? 'OVERRIDE_EVENT' : 'NEW_SEQUENCE'}
                </h2>
                <p className="text-[7px] text-zinc-600 italic tracking-[.2em]">IDENTIFIER: {selectedDate || 'MANUAL_ENTRY'}</p>
              </section>
              <button onClick={closeModal} className="text-zinc-700 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-8">
              <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 text-white outline-none uppercase text-xs tracking-widest focus:border-[#0ad1ea] transition-all" placeholder="DESCRIPTION_NULL" />
              <div className="flex gap-6">
                <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="flex-1 bg-[#08646E]/5 border border-white/5 p-3 text-white outline-none focus:border-[#0ad1ea]/50 text-xs" />
                <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="flex-1 bg-[#08646E]/5 border border-white/5 p-3 text-white outline-none focus:border-[#0ad1ea]/50 text-xs" />
              </div>
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-white/[0.02] border border-white/5 p-4 text-zinc-500 text-[10px] h-24 outline-none focus:border-[#0ad1ea]/30 resize-none uppercase" placeholder="DATA_STREAM_EMPTY" />
              <div className="flex gap-4">
                {editingEvent && <button onClick={handleDelete} disabled={isSubmitting} className="px-6 border border-red-900/50 text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={16} /></button>}
                <button onClick={handleSave} disabled={isSubmitting} className="flex-1 flex justify-center items-center gap-3 py-4 bg-[#0ad1ea] text-black font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={16} />} {isSubmitting ? "SYNCING..." : "COMMIT_CHANGES"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-20 pt-8 border-t border-white/5 flex justify-between items-center opacity-40">
        <div className="flex items-center gap-6 text-[8px] tracking-[0.4em] uppercase font-bold">
          <div className="flex items-center gap-2 text-[#08646E]">
            <Database size={12} />
            <span className="text-zinc-500">Sync_State: <span className="text-[#0ad1ea]">STABLE</span></span>
          </div>
          <div className="flex items-center gap-2 text-[#08646E]">
            <ShieldCheck size={12} />
            <span className="text-zinc-500">Node_Protocol: <span className="text-[#0ad1ea]">v4.2</span></span>
          </div>
        </div>
        <div className="text-[9px] tracking-[0.5em] uppercase italic text-[#08646E] font-bold">
          [SYS_CLOCK: {time || "--:--:--"}]
        </div>
      </footer>
    </div>
  );
}