"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { 
  Search, ExternalLink, FileText, Loader2, Plus, 
  Database, ShieldCheck, Activity, CloudCog, Lock, FolderOpen, UploadCloud
} from "lucide-react";

export default function DrivePage() {
  const sessionContext = useSession();
  const session = sessionContext?.data;
  
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchDrive(query = "") {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drive/count?q=${query}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("DRIVE_SYNC_ERROR", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted && session) {
      fetchDrive();
    }
  }, [session, mounted]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await fetch('/api/drive/upload', { method: 'POST', body: formData });
      fetchDrive();
    } finally {
      setUploading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="p-8 md:p-12 min-h-screen bg-gray-50 text-[#1e1248] font-sans">
      
      {/* HEADER CORPORATIVO */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#1e1248]/5 rounded-lg text-[#1e1248]">
              <CloudCog size={18} />
            </div>
            <span className="text-[10px] font-normal tracking-[0.3em] text-[#1e1248]/40 uppercase">Infraestructura Cloud</span>
          </div>
          <h1 className="text-4xl md:text-5xl tracking-tighter text-[#1e1248] font-normal uppercase">
            Gestión de <span className="text-[#e50051]">Activos</span>
          </h1>
        </div>
        
        <label className="relative group overflow-hidden bg-[#e50051] text-white px-8 py-4 rounded-2xl cursor-pointer transition-all hover:bg-[#c40045] hover:shadow-xl hover:shadow-[#e50051]/20 active:scale-95 shadow-lg shadow-[#e50051]/10">
          <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-normal">
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            {uploading ? "Sincronizando..." : "Subir Archivo"}
          </div>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </header>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative mb-12 max-w-3xl">
        <div className="relative flex items-center group">
          <Search className="absolute left-6 text-gray-300 group-focus-within:text-[#e50051] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre de archivo o extensión..."
            className="w-full bg-white border border-gray-100 rounded-[2rem] py-6 pl-16 pr-8 text-sm font-normal shadow-sm focus:border-[#1e1248]/20 focus:ring-4 focus:ring-[#1e1248]/5 outline-none text-[#1e1248] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDrive(search)}
          />
        </div>
      </div>

      {/* GRILLA DE ARCHIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-40 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
            <Loader2 className="animate-spin mb-6 text-[#e50051]" size={48} />
            <div className="text-[11px] tracking-[0.4em] uppercase text-gray-400 font-normal animate-pulse">Consultando Repositorios...</div>
          </div>
        ) : files.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white border border-gray-100 rounded-[2.5rem] border-dashed">
            <FolderOpen size={48} className="text-gray-100 mb-4" />
            <p className="text-sm font-normal text-gray-300 uppercase tracking-widest">No se encontraron activos</p>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              className="group bg-white border border-gray-100 rounded-[2rem] p-6 transition-all hover:shadow-2xl hover:shadow-[#1e1248]/5 hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-64 overflow-hidden relative shadow-sm"
              onClick={() => window.open(file.webViewLink, '_blank')}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-4 bg-gray-50 rounded-2xl text-[#1e1248] group-hover:bg-[#e50051] group-hover:text-white transition-all duration-300">
                  <FileText size={24} />
                </div>
                <div className="p-2 bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={14} className="text-[#1e1248]" />
                </div>
              </div>

              <div>
                <h3 className="text-sm text-[#1e1248] font-normal line-clamp-2 uppercase tracking-tight mb-4 group-hover:text-[#e50051] transition-colors leading-tight">
                  {file.name}
                </h3>
                
                <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <Activity size={12} className="text-[#e50051]" />
                    <span className="text-[9px] font-normal text-gray-400 uppercase tracking-tighter">
                      Modificado: {new Date(file.modifiedTime).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <Lock size={12} className="text-gray-200 group-hover:text-[#1e1248] transition-colors" />
                </div>
              </div>

              {/* Indicador visual inferior */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-[#e50051] group-hover:w-full transition-all duration-500" />
            </div>
          ))
        )}
      </div>

      {/* FOOTER CORPORATIVO */}
      <footer className="mt-20 pt-10 border-t border-gray-100 flex justify-center opacity-30">
        <div className="flex items-center gap-3">
          <ShieldCheck size={14} />
          <span className="text-[9px] font-normal uppercase tracking-[0.4em]">Almacenamiento Seguro Pago TIC // Cifrado AES-256</span>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e124810; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5005120; }
      `}</style>
    </div>
  );
}
