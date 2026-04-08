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
  Activity, 
  ChevronRight 
} from "lucide-react";

export default function CalendarPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [range, setRange] = useState('month'); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });

  const fetchCalendar = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      // Traemos todo el mes para tener data disponible
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
    fetchCalendar();
  }, [fetchCalendar]);

  // --- LÓGICA DE FILTRADO POR RANGO ---
  const filteredEvents = events.filter((event: any) => {
    const eventStart = event.start?.dateTime || event.start?.date;
    if (!eventStart) return false;
    const eventDate = new Date(eventStart);
    const now = new Date();

    if (range === 'today') {
      return eventDate.toDateString() === now.toDateString();
    }
    if (range === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    }
    return true; // month
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData({ title: "", description: "" });
    setSelectedDate("");
    setIsSubmitting(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return alert("Título requerido");
    setIsSubmitting(true);
    
    let startDate, endDate;
    if (editingEvent) {
      startDate = editingEvent.start.dateTime || editingEvent.start.date;
      endDate = editingEvent.end.dateTime || editingEvent.end.date;
    } else {
      const base = selectedDate || new Date().toISOString().split('T')[0];
      startDate = base;
      endDate = base;
    }

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent?.id || null,
          summary: formData.title,
          description: formData.description,
          start: startDate,
          end: endDate,
        }),
      });

      if (res.ok) {
        closeModal();
        fetchCalendar();
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "No se pudo guardar"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;
    if (!confirm("¿Eliminar este protocolo?")) return;
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
    <div className="p-8 min-h-screen bg-[#020202] text-zinc-300 font-mono">
      <header className="mb-8 flex justify-between items-center border-b border-[#08646E]/20 pb-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="text-[#08646E]" />
          <h1 className="text-xl text-white uppercase italic tracking-tighter">AGENDA <span className="text-[#08646E] font-bold">SQUAD</span></h1>
        </div>
        <div className="flex bg-black border border-white/5 p-1 rounded-lg gap-1">
          {['today', 'week', 'month'].map((r) => (
            <button 
              key={r} 
              onClick={() => setRange(r)} 
              className={`px-4 py-1 text-[12px] uppercase tracking-widest transition-all rounded-md ${range === r ? 'bg-[#08646E] text-white shadow-[0_0_10px_#08646E]' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#08646E]" /></div>
      ) : range === 'month' ? (
        <div className="grid grid-cols-7 gap-px bg-[#08646E]/20 border border-[#08646E]/20 rounded-2xl overflow-hidden">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="bg-[#050505] p-3 text-center text-[10px] text-[#08646E] font-bold uppercase tracking-[0.2em]">{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = day > 0 && day <= daysInMonth;
            const cellDate = new Date(currentYear, currentMonth, day);
            const dateStr = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, '0') + "-" + String(cellDate.getDate()).padStart(2, '0');
            const dayEvents = events.filter((e: any) => (e.start?.dateTime || e.start?.date || "").includes(dateStr));

            return (
              <div key={idx} className={`min-h-[110px] p-2 bg-[#020202] border-[#08646E]/5 border-r border-b relative group transition-colors ${!isCurrentMonth ? 'opacity-5' : 'hover:bg-[#08646E]/5'}`}>
                {isCurrentMonth && (
                  <>
                    <span className="text-[10px] font-bold text-zinc-700">{day}</span>
                    <button onClick={() => { setSelectedDate(dateStr); setIsModalOpen(true); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[#08646E]"><Plus size={14} /></button>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                      {dayEvents.map((e: any) => (
                        <div key={e.id} onClick={() => { setEditingEvent(e); setFormData({title: e.summary, description: e.description || ""}); setIsModalOpen(true); }} className="text-[9px] bg-[#08646E]/10 text-[#08646E] p-1 rounded truncate border border-[#08646E]/20 cursor-pointer hover:bg-[#08646E]/30 uppercase italic">{e.summary}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true); }} className="w-full p-4 border border-dashed border-[#08646E]/30 rounded-2xl flex items-center justify-center gap-3 text-[#08646E] text-[10px] uppercase tracking-widest hover:bg-[#08646E]/5 transition-all mb-8"><Plus size={16} /> Nuevo Protocolo</button>
          {filteredEvents.map((event) => (
            <div key={event.id} onClick={() => { setEditingEvent(event); setFormData({title: event.summary, description: event.description || ""}); setIsModalOpen(true); }} className="group p-6 border border-white/5 bg-[#050505] rounded-[24px] hover:border-[#08646E]/40 transition-all flex items-center justify-between cursor-pointer">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-[#08646E] text-[10px] font-bold uppercase tracking-widest bg-[#08646E]/10 px-2 py-1 rounded w-fit">
                  <Clock size={12} /> {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Todo el día"}
                  <span className="opacity-30 mx-1">|</span> {new Date(event.start?.dateTime || event.start?.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </div>
                <h3 className="text-lg text-zinc-100 font-light group-hover:text-white transition-colors uppercase italic leading-none tracking-tighter">{event.summary}</h3>
              </div>
              <ChevronRight className="text-zinc-800 group-hover:text-[#08646E] transition-all" size={24} />
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-[#08646E]/30 w-full max-w-md rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-[#08646E] text-[10px] uppercase font-bold tracking-widest">{editingEvent ? 'Editar' : 'Nuevo'} Protocolo</h2><span className="text-[8px] text-zinc-600 italic">SYSTEM_OVERRIDE_ENABLED</span></div>
              <button onClick={closeModal} className="p-2 text-zinc-500"><X size={18} /></button>
            </div>
            <input type="text" placeholder="TÍTULO" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-transparent border-b border-[#08646E]/20 py-3 text-white outline-none mb-6 uppercase text-xs tracking-widest focus:border-[#08646E]" />
            <textarea placeholder="NOTAS" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-[#08646E]/5 border border-[#08646E]/10 rounded-2xl p-4 text-zinc-400 text-[11px] mb-8 h-24 outline-none focus:border-[#08646E]/20 resize-none" />
            <div className="flex gap-4">
              {editingEvent && <button onClick={handleDelete} disabled={isSubmitting} className="px-6 py-3 border border-red-900/30 text-red-500 rounded-full text-[10px] uppercase hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button>}
              <button onClick={handleSave} disabled={isSubmitting} className="flex-1 flex justify-center items-center gap-2 py-3 bg-[#08646E] text-white rounded-full text-[10px] uppercase font-bold tracking-widest hover:bg-[#0a828f] transition-all disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={16} />} {isSubmitting ? "Sincronizando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}