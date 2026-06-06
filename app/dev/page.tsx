"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Terminal, 
  X, Fingerprint, ChevronRight,
  Search, Server
} from 'lucide-react';
import { workspaceProfile, workspaceSectionList } from '@/src/lib/workspaceProfile';

// --- COMPONENTE DE VISUALIZACIÓN DE DATOS ---
const DataStream = ({ content, isReading }: { content: string, isReading: boolean }) => {
  if (isReading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-gray-50 border border-gray-100 rounded-2xl">
        <RefreshCw size={40} className="animate-spin text-[#e50051]" />
        <span className="text-[10px] tracking-[0.4em] text-[#1e1248] uppercase font-normal opacity-40">
          Sincronizando espacio...
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-[500px]">
      <div className="bg-[#1e1248] p-8 rounded-2xl font-mono text-[12px] h-full overflow-y-auto custom-scrollbar relative shadow-inner">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#1e1248] pb-4 z-20 border-b border-white/10">
          <div className="text-[#e50051] tracking-tight font-normal flex items-center gap-2">
            <Terminal size={14} /> INSPECTOR_DE_ARCHIVO
          </div>
          <div className="text-[9px] text-white/50 tracking-widest uppercase font-normal border border-white/10 px-2 py-1 rounded">
            FUENTE_CARGADA
          </div>
        </div>
        
        <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed font-normal selection:bg-[#e50051] selection:text-white">
          {content || "// INICIALIZANDO LECTURA..."}
        </pre>
      </div>
    </div>
  );
};

export default function DevPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>({ requirements: [], workItems: [], qa: [], knowledge: [] });
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
        requirements: json.requirements || json.cotizaciones || [],
        workItems: json.workItems || json.migrations || [],
        qa: json.qa || json.tests || [],
        knowledge: json.knowledge || []
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
    } catch (e) { setFileContent("// ERROR_DE_LECTURA"); } 
    finally { setIsReading(false); }
  };

  if (!mounted) return null;

  const Column = ({ title, items, icon: Icon, sectorKey }: any) => (
    <div className="flex-1 bg-white border border-gray-100 rounded-3xl flex flex-col h-[70vh] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className="p-5 flex items-center gap-4 border-b border-gray-50 bg-gray-50/50">
        <div className="p-2.5 bg-[#1e1248] text-white rounded-xl shadow-lg shadow-[#1e1248]/10">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-[11px] font-normal uppercase tracking-widest text-[#1e1248]">{title}</h2>
          <p className="text-[9px] text-gray-400 font-normal uppercase">
            <span className="text-[#e50051]">{items?.length || 0}</span> Elementos
          </p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
        {items?.map((item: any, i: number) => (
          <div 
            key={i} 
            onClick={() => openFile(item.name, sectorKey)}
            className="group p-4 bg-white border border-gray-50 hover:border-[#e50051]/20 hover:bg-gray-50 rounded-2xl transition-all cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-normal text-[#1e1248]/70 group-hover:text-[#1e1248] truncate uppercase tracking-tight">
                {item.name}
              </p>
              <ChevronRight size={14} className="text-[#e50051] opacity-0 group-hover:opacity-100 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans text-[#1e1248]">
      
      <header className="mb-10 flex justify-between items-end border-b border-gray-200 pb-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-[#e50051]">
            <Server size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-[#e50051] animate-pulse" />
              <span className="text-[10px] font-normal uppercase tracking-[0.3em] text-[#1e1248]/40">{workspaceProfile.domain}</span>
            </div>
            <h1 className="text-4xl font-normal tracking-tighter uppercase text-[#1e1248]">
              Development <span className="text-[#e50051]">Workspace</span>
            </h1>
          </div>
        </div>
        
        <button 
          onClick={loadData} 
          className="flex items-center gap-3 px-6 py-3 bg-[#1e1248] text-white rounded-xl hover:bg-[#2d1b6b] transition-all shadow-lg shadow-[#1e1248]/20 font-normal text-xs uppercase tracking-widest"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Sincronizar
        </button>
      </header>

      <div className="flex gap-6">
        {workspaceSectionList
          .filter(section => ['requirements', 'workItems', 'qa'].includes(section.key))
          .map((section, index) => (
            <Column
              key={section.key}
              title={`${String(index + 1).padStart(2, '0')}. ${section.title}`}
              items={data[section.key]}
              sectorKey={section.key}
              icon={section.icon}
            />
          ))}
      </div>

      {/* MODAL VIEW CORPORATIVO */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1e1248]/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-6xl bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl">
            
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-[#e50051] text-white rounded-2xl shadow-lg shadow-[#e50051]/20">
                  <Search size={24} />
                </div>
                <div>
                  <h3 className="text-[#1e1248] font-normal text-xl uppercase tracking-tight">Inspector de Archivo</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 text-[#1e1248]/60 px-2 py-0.5 rounded font-normal uppercase tracking-widest">{selectedItem.sector}</span>
                    <span className="text-[#e50051] font-normal">/</span>
                    <span className="text-xs text-[#1e1248] font-normal tracking-tight">{selectedItem.name}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-[#1e1248]" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-12 gap-8">
              <div className="col-span-4 space-y-6">
                <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl space-y-6">
                   <div>
                      <p className="text-[9px] text-gray-400 uppercase font-normal tracking-widest mb-2">Identificador</p>
                      <p className="text-lg text-[#1e1248] font-normal uppercase tracking-tight flex items-center gap-3">
                        <Fingerprint size={20} className="text-[#e50051]" /> {selectedItem.name.split('.')[0]}
                      </p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                        <p className="text-[8px] text-gray-400 font-normal uppercase mb-1">Tamaño</p>
                        <p className="text-sm text-[#1e1248] font-normal">{metadata?.size || "..."}</p>
                      </div>
                      <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                        <p className="text-[8px] text-[#e50051] font-normal uppercase mb-1">Estado</p>
                        <p className="text-sm text-[#1e1248] font-normal">DISPONIBLE</p>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-[#e50051] rounded-3xl text-white shadow-lg shadow-[#e50051]/20">
                   <p className="text-[10px] font-normal uppercase tracking-widest leading-relaxed italic opacity-90">
                     Espacio tecnico sincronizado. Listo para analisis, documentacion y desarrollo.
                   </p>
                </div>
              </div>

              <div className="col-span-8">
                <DataStream content={fileContent} isReading={isReading} />
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                <button className="px-8 py-3 text-[#1e1248] font-normal text-[10px] uppercase hover:bg-gray-100 rounded-xl transition-all tracking-widest">
                  Exportar Archivo
                </button>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="px-10 py-3 bg-[#e50051] text-white font-normal text-[10px] uppercase hover:bg-[#c40045] rounded-xl transition-all shadow-lg shadow-[#e50051]/20 tracking-widest"
                >
                  Cerrar Inspección
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
