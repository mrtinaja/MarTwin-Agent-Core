"use client";
import React, { useState, useEffect } from 'react';
import { Database, FileCode, CheckCircle, Activity, LayoutDashboard, RefreshCw } from 'lucide-react';

export default function DevPage() {
  const [data, setData] = useState({ cotizaciones: [], migraciones: [], tests: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/docs/read');
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const Column = ({ title, items, icon: Icon, color }: any) => (
    <div className="flex-1 bg-[#050505] border border-white/5 rounded-[32px] overflow-hidden flex flex-col h-[70vh]">
      <div className={`p-6 border-b border-white/5 flex items-center gap-3 ${color}`}>
        <Icon size={18} />
        <h2 className="text-xs font-bold uppercase tracking-[0.2em]">{title}</h2>
        <span className="ml-auto text-[10px] opacity-50">{items.length}</span>
      </div>
      <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
        {items.map((item: any, i: number) => (
          <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#07514c]/40 transition-all group">
            <p className="text-[10px] font-mono text-zinc-300 truncate">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-10 bg-[#020202] min-h-screen font-mono text-zinc-400">
      <header className="mb-10 flex justify-between items-center">
        <h1 className="text-2xl text-white italic tracking-tighter flex items-center gap-4">
          <LayoutDashboard className="text-[#07514c]" /> PIPELINE / <span className="text-[#07514c] font-bold not-italic">ENGINEERING</span>
        </h1>
        <button onClick={loadData} className="p-3 bg-[#07514c]/10 text-[#07514c] rounded-full hover:bg-[#07514c] hover:text-white transition-all">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="flex gap-6">
        <Column title="1. Cotización (.json)" items={data.cotizaciones} icon={Activity} color="text-purple-500" />
        <Column title="2. Migración (.md)" items={data.migraciones} icon={Database} color="text-[#07514c]" />
        <Column title="3. QA & Testing (.md)" items={data.tests} icon={CheckCircle} color="text-emerald-500" />
      </div>
    </div>
  );
}