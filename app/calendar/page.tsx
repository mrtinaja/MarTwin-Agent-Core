"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  Clock, Loader2, Plus, X, Trash2, Save, ChevronRight, Database, ShieldCheck, Terminal 
} from "lucide-react";

export default function CalendarPage() {
  const sessionContext = useSession();
  const session = sessionContext?.data;

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(""); 
  const [range, setRange] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    title: "", description: "", startTime: "09:00", endTime: "10:00"
  });

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
      console.error("❌ CALENDAR_SYNC_FAILURE:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (mounted && session) fetchCalendar();
  }, [fetchCalendar, mounted, session]);

  if (!mounted) return <div className="h-screen bg-[#020202]" />;

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
          summary: formData.title.toUpperCase(),
          start: `${baseDate}T${formData.startTime}:00`,
          end: `${baseDate}T${formData.endTime}:00`,
        }),
      });
      if (res.ok) { setIsModalOpen(false); setEditingEvent(null); fetchCalendar(); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-screen w-full bg-[#020202] text-zinc-400 font-mono font-extralight select-none flex items-center justify-center p-4 md:p-8">
      {/* CONTENEDOR CENTRAL AMARILLO */}
      <div className="w-full max-w-7xl h-full flex flex-col bg-[#050505]/40 border border-yellow-500/10 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* DECORACIÓN AMARILLA */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

        {/* HEADER */}
        <header className="mb-6 flex justify-between items-end shrink-0">
          <section>
            <div className="text-[8px] tracking-[0.6em] text-yellow-700 uppercase mb-1 font-bold">Terminal_Temporal_Access</div>
            <h1 className="text-3xl tracking-tighter text-yellow-500 uppercase italic font-black">
              SQUAD <span className="text-white">AGENDA_LOG</span>
            </h1>
          </section>
          
          <nav className="flex bg-black border border-yellow-500/20 p-1">
            {['today', 'week', 'month'].map((r) => (
              <button 
                key={r} 
                onClick={() => setRange(r)} 
                className={`px-4 py-1.5 text-[10px] uppercase tracking-widest transition-all font-bold ${range === r ? 'bg-yellow-500 text-black shadow-[0_0_15px_#eab308]' : 'text-zinc-600 hover:text-zinc-300'}`}
              >
                {r}
              </button>
            ))}
          </nav>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="flex-1 min-h-0 w-full border border-yellow-500/10 relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center bg-black/20">
              <Loader2 className="animate-spin text-yellow-500 mb-2" size={32} />
              <div className="text-[10px] tracking-[0.5em] text-yellow-500 animate-pulse">SYNCING_AMBER_SEQUENCE...</div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* DÍAS SEMANA */}
              <div className="grid grid-cols-7 shrink-0 bg-black/60">
                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
                  <div key={d} className="py-2.5 text-center text-[10px] text-yellow-700 font-black border-b border-yellow-500/10 tracking-widest">{d}</div>
                ))}
              </div>
              
              {/* CUERPO CALENDARIO AMARILLO */}
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
                      className={`relative p-2 border-r border-b border-yellow-500/10 transition-all flex flex-col group ${
                        !isCurrentMonth ? 'opacity-5' : 'hover:bg-yellow-500/5'
                      } ${isToday ? 'bg-yellow-500/5 z-10' : ''}`}
                    >
                      {isToday && (
                        <>
                          <div className="absolute inset-0 border border-yellow-500 animate-pulse-yellow" />
                          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 bg-yellow-500 shadow-[0_0_8px_#f59e0b]" />
                        </>
                      )}

                      {isCurrentMonth && (
                        <>
                          <div className="flex justify-between items-center mb-1 relative z-20">
                            <span className={`text-xs font-black ${isToday ? 'text-yellow-400 drop-shadow-[0_0_5px_#f59e0b]' : 'text-yellow-500/60'}`}>
                              {String(day).padStart(2, '0')}
                            </span>
                            <Plus 
                              onClick={() => { setSelectedDate(dateStr); setIsModalOpen(true); }} 
                              size={12} 
                              className="opacity-0 group-hover:opacity-100 text-yellow-500 cursor-pointer hover:scale-125 transition-transform" 
                            />
                          </div>
                          
                          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1 relative z-20">
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
                                className="text-[8px] bg-black/60 border-l border-yellow-500/60 text-yellow-100/70 px-1.5 py-1 truncate cursor-pointer hover:border-yellow-500 hover:bg-yellow-500/20 transition-all uppercase"
                              >
                                {e.summary}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER AMARILLO */}
        <footer className="mt-6 flex justify-between items-center shrink-0 border-t border-white/5 pt-4">
          <div className="flex gap-6 text-[8px] tracking-[0.3em] font-bold">
            <div className="flex items-center gap-2"><Database size={12} className="text-yellow-800"/> <span>SERVER: <span className="text-yellow-500">READY</span></span></div>
            <div className="flex items-center gap-2"><ShieldCheck size={12} className="text-yellow-800"/> <span>ENCRYPTION: <span className="text-yellow-500">ENABLED</span></span></div>
          </div>
          <div className="text-[10px] tracking-[0.5em] text-yellow-500 font-black italic">
            {time || "00:00:00"}
          </div>
        </footer>
      </div>

      {/* MODAL AMARILLO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-[#050505] border border-yellow-500/40 w-full max-w-md p-8 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative">
            <div className="absolute top-0 right-0 p-4">
               <X onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-white cursor-pointer" size={20} />
            </div>
            <h2 className="text-yellow-500 text-xs uppercase font-black tracking-[0.4em] mb-8 flex items-center gap-3">
              <Terminal size={16} /> Override_Amber_Log
            </h2>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] text-yellow-700 uppercase tracking-widest font-bold">Protocol_Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs outline-none focus:border-yellow-500/50 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] text-yellow-700 uppercase tracking-widest font-bold">Start_Time</label>
                  <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs outline-none focus:border-yellow-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-yellow-700 uppercase tracking-widest font-bold">End_Time</label>
                  <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs outline-none focus:border-yellow-500/50" />
                </div>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-yellow-500 text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                Execute_Amber_Commit
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse-yellow {
          0%, 100% { border-color: rgba(234, 179, 8, 1); opacity: 1; box-shadow: 0 0 10px rgba(234, 179, 8, 0.2); }
          50% { border-color: rgba(234, 179, 8, 0.2); opacity: 0.8; box-shadow: 0 0 5px rgba(234, 179, 8, 0.1); }
        }
        .animate-pulse-yellow { animation: pulse-yellow 2s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eab308; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}