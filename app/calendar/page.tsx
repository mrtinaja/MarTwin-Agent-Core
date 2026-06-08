"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  Clock, Loader2, Plus, X, Trash2, Save, ChevronRight, Database, ShieldCheck, Terminal, Calendar as CalendarIcon, ChevronLeft
} from "lucide-react";

export default function CalendarPage() {
  const sessionContext = useSession();
  const session = sessionContext?.data;

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    title: "", description: "", startTime: "09:00", endTime: "10:00"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCalendar = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar/today?range=month`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("❌ CALENDAR_SYNC_FAILURE:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (mounted && session) fetchCalendar();
  }, [fetchCalendar, mounted, session]);

  if (!mounted) return <div className="h-screen bg-gray-50" />;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, i) => i - offset + 1);

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    const baseDate = selectedDate || (editingEvent 
      ? (editingEvent.start.dateTime || editingEvent.start.date).split('T')[0] 
      : new Date().toISOString().split('T')[0]);
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent?.id || null,
          summary: formData.title,
          start: `${baseDate}T${formData.startTime}:00`,
          end: `${baseDate}T${formData.endTime}:00`,
        }),
      });
      if (res.ok) { setIsModalOpen(false); setEditingEvent(null); fetchCalendar(); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-screen w-full bg-gray-50 text-[#1e1248] font-sans select-none flex items-center justify-center p-4 md:p-8">
      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-7xl h-full flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-[#1e1248]/5 overflow-hidden">
        
        {/* HEADER CORPORATIVO */}
        <header className="p-8 flex justify-between items-center border-b border-gray-50 bg-white shrink-0">
          <section className="flex items-center gap-4">
            <div className="p-3 bg-[#1e1248] rounded-2xl text-white shadow-lg shadow-[#1e1248]/20">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-normal tracking-tight text-[#1e1248] uppercase">
                Gestión de <span className="text-[#e50051]">Agenda</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Sincronización en tiempo real</span>
              </div>
            </div>
          </section>
          
          <nav className="flex bg-gray-50 rounded-2xl p-1 border border-gray-100">
            {['today', 'week', 'month'].map((r) => (
              <button 
                key={r} 
                onClick={() => setRange(r)} 
                className={`px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all font-normal ${range === r ? 'bg-white text-[#1e1248] shadow-sm' : 'text-gray-400 hover:text-[#1e1248]'}`}
              >
                {r}
              </button>
            ))}
          </nav>
        </header>

        {/* CUERPO DEL CALENDARIO */}
        <div className="flex-1 min-h-0 w-full relative bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-[#e50051] mb-4" size={48} />
              <div className="text-[10px] tracking-[0.4em] font-normal text-gray-300 uppercase animate-pulse">Cargando cronograma corporativo...</div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* DÍAS DE LA SEMANA */}
              <div className="grid grid-cols-7 shrink-0 border-b border-gray-50">
                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
                  <div key={d} className="py-4 text-center text-[10px] text-gray-400 font-normal tracking-widest">{d}</div>
                ))}
              </div>
              
              {/* GRILLA DE DÍAS */}
              <div className="grid grid-cols-7 flex-1">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = day > 0 && day <= daysInMonth;
                  const isToday = isCurrentMonth && day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                  const cellDate = new Date(currentYear, currentMonth, day);
                  const dateStr = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, '0') + "-" + String(cellDate.getDate()).padStart(2, '0');
                  const dayEvents = events.filter((e: any) => (e.start?.dateTime || e.start?.date || "").includes(dateStr));

                  return (
                    <div 
                      key={idx} 
                      className={`relative p-3 border-r border-b border-gray-50 transition-all flex flex-col group ${
                        !isCurrentMonth ? 'bg-gray-50/30' : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className={`text-xs font-normal ${
                          isToday ? 'bg-[#e50051] text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-lg shadow-[#e50051]/30' : 
                          isCurrentMonth ? 'text-[#1e1248]' : 'text-gray-200'
                        }`}>
                          {isCurrentMonth ? String(day).padStart(2, '0') : ""}
                        </span>
                        {isCurrentMonth && (
                          <button 
                            onClick={() => { setSelectedDate(dateStr); setIsModalOpen(true); }}
                            className="opacity-0 group-hover:opacity-100 p-1 bg-gray-100 rounded-lg text-[#1e1248] hover:bg-[#e50051] hover:text-white transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1 relative z-10">
                        {isCurrentMonth && dayEvents.map((e: any) => (
                          <div 
                            key={e.id}
                            onClick={() => {
                              const start = new Date(e.start?.dateTime || e.start?.date);
                              const end = new Date(e.end?.dateTime || e.end?.date);
                              setEditingEvent(e);
                              setFormData({ title: e.summary, description: e.description || "", startTime: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), endTime: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
                              setIsModalOpen(true);
                            }}
                            className="text-[9px] bg-white border border-gray-100 text-[#1e1248] px-2 py-1.5 rounded-xl shadow-sm truncate cursor-pointer hover:border-[#e50051]/30 hover:shadow-md transition-all font-normal"
                          >
                            <span className="w-1 h-1 bg-[#e50051] rounded-full inline-block mr-1.5" />
                            {e.summary}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="p-6 bg-gray-50 flex justify-between items-center shrink-0">
          <div className="flex gap-6 text-[9px] font-normal uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-2"><Database size={14} className="text-[#1e1248]"/> <span>Status: <span className="text-[#1e1248]">Cloud_Connected</span></span></div>
            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#1e1248]"/> <span>Access: <span className="text-[#1e1248]">Encrypted</span></span></div>
          </div>
          <div className="text-[10px] font-normal text-[#e50051] bg-white px-4 py-1.5 rounded-full shadow-sm">
            MarTwin Intelligence v6.0
          </div>
        </footer>
      </div>

      {/* MODAL DE EVENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1e1248]/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white border border-gray-100 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-[#1e1248] text-sm uppercase font-normal tracking-widest mb-8 flex items-center gap-3">
              <Plus className="text-[#e50051]" size={18} /> Programar Actividad
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-normal tracking-widest">Asunto del Evento</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="Ej: Reunión de Estrategia"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[#1e1248] text-xs outline-none focus:border-[#e50051]/30 focus:ring-4 focus:ring-[#e50051]/5 transition-all font-normal" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-normal tracking-widest">Inicio</label>
                  <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[#1e1248] text-xs outline-none focus:border-[#e50051]/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-normal tracking-widest">Fin</label>
                  <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[#1e1248] text-xs outline-none focus:border-[#e50051]/30 transition-all" />
                </div>
              </div>

              <button 
                onClick={handleSave} 
                className="w-full py-4 bg-[#1e1248] text-white font-normal text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e50051] transition-all shadow-xl shadow-[#1e1248]/20"
              >
                Confirmar en Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e124810; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5005120; }
      `}</style>
    </div>
  );
}
