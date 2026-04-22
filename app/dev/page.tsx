"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, Activity, RefreshCw, Cpu, Terminal, 
  X, Brackets, Microscope, Zap, ShieldCheck, FileCode,
  Binary, Fingerprint, Eye, Radio, Orbit, AlertTriangle,
  ChevronRight
} from 'lucide-react';

// --- PALETA DE COLORES MARTWIN ---
// Primario (Cian): #088395
// Secundario (Ámbar): #FFB000
// Fondo: #020202

const DataStream = ({ content, isReading }: { content: string, isReading: boolean }) => {
  if (isReading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#088395]/5 border border-[#088395]/20">
        <div className="relative">
          <RefreshCw size={48} className="animate-spin text-[#088395] drop-shadow-[0_0_15px_#088395]" />
        </div>
        <span className="text-[11px] tracking-[0.8em] text-[#088395] uppercase animate-pulse font-black">
          Syncing_MarTwin_Core...
        </span>
      </div>
    );
  }

  return (
    <div className="relative group h-[500px]">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,255,0.02),rgba(255,176,0,0.02))] bg-[length:100%_4px,3px_100%] z-20"></div>
      
      <div className="bg-[#050505] p-8 rounded-none border border-[#088395]/30 font-mono text-[12px] h-full overflow-y-auto custom-scrollbar relative selection:bg-[#FFB000] selection:text-black">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#050505]/95 backdrop-blur-sm py-2 z-20 border-b border-[#088395]/20">
          <div className="text-[#088395] tracking-tighter italic font-black flex items-center gap-2">
            <Terminal size={14} /> {">> MARTWIN_LOG_STREAM"}
          </div>
          <div className="text-[9px] text-[#FFB000] tracking-widest uppercase font-bold border border-[#FFB000]/30 px-2 py-0.5">
            Verified_Source
          </div>
        </div>
        
        <pre className="text-zinc-300 opacity-90 whitespace-pre-wrap leading-relaxed font-medium">
          {content || ">> [SYSTEM]: INITIALIZING_BUFFER_READ..."}
        </pre>
      </div>
    </div>
  );
};

export default function DevPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>({ quotations: [], migrations: [], tests: [] });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [metadata, setMetadata] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/docs/read');
      const json = await res.json();
      setData({
        quotations: json.cotizaciones || [],
        migrations: json.migrations || [],
        tests: json.tests || []
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { 
    setMounted(true);
    loadData(); 
  }, []);

  const openFile = async (name: string, sector: string) => {
    setSelectedItem({ name, sector });
    setIsReading(true);
    setFileContent("");
    try {
      const res = await fetch(`/api/docs/read?name=${name}`);
      const json = await res.json();
      if (json.content) {
        setFileContent(json.content);
        setMetadata(json.metadata);
      }
    } catch (e) { setFileContent(">> UPLINK_TIMEOUT"); } 
    finally { setIsReading(false); }
  };

  if (!mounted) return null;

  const Column = ({ title, items, icon: Icon, colorClass, borderClass, barClass, sectorKey, glowClass }: any) => (
    <div className={`flex-1 bg-[#0a0a0a] border ${borderClass} rounded-none flex flex-col h-[75vh] relative group transition-all duration-300`}>
      <div className={`absolute top-0 left-0 w-full h-[2px] ${barClass} opacity-40`} />
      
      <div className="p-5 flex items-center gap-4 border-b border-white/5 bg-black/40 relative z-10">
        <div className={`p-2 ${colorClass} bg-black border ${borderClass} shadow-[0_0_15px_rgba(8,131,149,0.1)]`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">{title}</h2>
          <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">
            <span className={colorClass}>{items?.length || 0}</span> Objects_Found
          </p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar relative z-10">
        {items?.map((item: any, i: number) => (
          <div 
            key={i} 
            onClick={() => openFile(item.name, sectorKey)}
            className="group relative p-4 bg-[#050505] border border-white/5 hover:border-[#088395]/40 transition-all cursor-pointer active:scale-[0.97]"
          >
            <div className={`absolute top-0 left-0 w-[2px] h-full ${barClass} opacity-0 group-hover:opacity-100 transition-all`} />
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-zinc-400 group-hover:text-white truncate uppercase">
                {item.name}
              </p>
              <ChevronRight size={12} className={`${colorClass} opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-10 bg-[#020202] min-h-screen font-mono text-zinc-400 relative overflow-hidden">
      {/* Background Subtle MarTwin Branding */}
      <div className="fixed -bottom-20 -left-20 w-[500px] h-[500px] bg-[#088395]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="mb-12 flex justify-between items-center relative z-10 border-b border-[#088395]/20 pb-8">
        <div className="flex items-center gap-6">
          {/* Logo Placeholder Simulation */}
          <div className="p-3 border-2 border-[#FFB000] bg-black">
            <Cpu size={24} className="text-[#FFB000]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[#088395] animate-pulse" />
              <span className="text-[10px] tracking-[0.5em] text-[#088395] font-black uppercase">Infrastructure_Node</span>
            </div>
            <h1 className="text-4xl text-white font-black italic tracking-tighter uppercase leading-none">
              PIPELINE <span className="text-[#FFB000] not-italic drop-shadow-[0_0_10px_rgba(255,176,0,0.3)]">COLLECTOR</span>
            </h1>
          </div>
        </div>
        
        <button 
          onClick={loadData} 
          className="group relative h-14 w-14 flex items-center justify-center bg-black border border-[#088395]/40 text-[#088395] hover:border-[#FFB000] hover:text-[#FFB000] transition-all"
        >
          <RefreshCw size={24} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
        </button>
      </header>

      <div className="flex gap-6 relative z-10">
        <Column 
          title="01_QUOTES" 
          items={data.quotations} 
          sectorKey="quotations" 
          icon={Binary} 
          colorClass="text-[#088395]" 
          borderClass="border-[#088395]/10 hover:border-[#088395]/30" 
          barClass="bg-[#088395]"
        />
        <Column 
          title="02_DEV_CORE" 
          items={data.migrations} 
          sectorKey="migrations" 
          icon={Database} 
          colorClass="text-[#FFB000]" 
          borderClass="border-[#FFB000]/10 hover:border-[#FFB000]/30" 
          barClass="bg-[#FFB000]"
        />
        <Column 
          title="03_QA_REPORTS" 
          items={data.tests} 
          sectorKey="tests" 
          icon={Activity} 
          colorClass="text-[#088395]" 
          borderClass="border-[#088395]/10 hover:border-[#088395]/30" 
          barClass="bg-[#088395]"
        />
      </div>

      {/* MODAL VIEW */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl bg-[#080808] border border-[#088395]/40 rounded-none overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]">
            
            <div className="p-6 border-b border-[#088395]/20 flex justify-between items-center bg-black">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-[#088395] text-black">
                  <Orbit size={24} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg uppercase italic tracking-tighter">DATA_INSPECTOR</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#FFB000] font-black uppercase tracking-widest">{selectedItem.sector}</span>
                    <span className="text-[10px] text-zinc-600 font-bold">/</span>
                    <span className="text-[10px] text-zinc-400 tracking-wider underline decoration-[#088395] underline-offset-4">{selectedItem.name}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="group flex items-center gap-2 text-zinc-500 hover:text-[#FFB000] transition-colors font-black text-[10px] tracking-widest"
              >
                CLOSE_PREVIEW <X size={32} className="p-2 border border-transparent group-hover:border-[#FFB000] transition-all" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-12 gap-8">
              <div className="col-span-4 space-y-6">
                <div className="p-6 bg-black border border-white/5 space-y-6 relative overflow-hidden">
                   <div>
                      <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2">Object_ID</p>
                      <p className="text-[14px] text-white font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Fingerprint size={16} className="text-[#088395]" /> {selectedItem.name.split('.')[0]}
                      </p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-zinc-900/40 border-l border-[#FFB000]">
                        <p className="text-[8px] text-[#FFB000] font-black uppercase mb-1">Payload_Size</p>
                        <p className="text-sm text-white font-black">{metadata?.size || "SYNC..."}</p>
                      </div>
                      <div className="p-3 bg-zinc-900/40 border-l border-[#088395]">
                        <p className="text-[8px] text-[#088395] font-black uppercase mb-1">Status</p>
                        <p className="text-sm text-white font-black">ENCRYPTED</p>
                      </div>
                   </div>
                </div>

                <div className="p-5 bg-[#088395]/5 border-l-2 border-[#088395] relative">
                   <p className="text-[10px] text-[#088395] font-bold uppercase tracking-widest leading-relaxed italic">
                     {">> Sector access authorized. MarTwin Security Protocol active."}
                   </p>
                </div>
              </div>

              <div className="col-span-8">
                <DataStream content={fileContent} isReading={isReading} />
              </div>
            </div>

            <div className="p-8 border-t border-[#088395]/10 bg-black flex justify-end gap-4">
                <button 
                  className="px-8 py-3 border border-[#088395]/40 text-[#088395] font-black text-[10px] uppercase hover:bg-[#088395] hover:text-black transition-all tracking-[0.2em]"
                >
                  PUSH_TO_MASTER
                </button>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="px-12 py-3 bg-[#FFB000] text-black font-black text-[10px] uppercase hover:bg-white transition-all tracking-[0.2em]"
                >
                  DISCONNECT_NODE
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}