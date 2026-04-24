"use client";

// 1. Forzamos el modo dinámico para que Next.js no intente pre-renderizarlo sin sesión
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { 
  Search, ExternalLink, FileText, Loader2, Plus, 
  Database, ShieldCheck, Activity, CloudCog, Lock 
} from "lucide-react";

export default function DrivePage() {
  // 🟢 CORRECCIÓN DE SEGURIDAD: Evitamos desestructurar directamente
  const sessionContext = useSession();
  const session = sessionContext?.data;
  
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Aseguramos que el componente esté montado en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchDrive(query = "") {
    if (!session) return; // No intentamos fetch sin sesión
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
    // Solo ejecutamos si estamos en el cliente y hay sesión
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

  // 🟢 RENDERIZADO DEFENSIVO: Si no está montado, devolvemos un cascarón vacío
  // Esto evita el error de "Hydration Mismatch" y errores de Prerendering
  if (!mounted) {
    return <div className="min-h-screen bg-[#020202]" />;
  }

  return (
    <div className="p-12 min-h-screen bg-[#020202] text-zinc-400 font-mono select-none">
      {/* SCANLINE OVERLAY */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(0,255,255,0.02), rgba(255,176,0,0.02))`,
          backgroundSize: '100% 4px, 4px 100%'
        }}
      />

      <header className="mb-12 flex justify-between items-end border-b border-[#088395]/20 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <CloudCog size={18} className="text-[#088395] animate-pulse" />
            <span className="text-[10px] tracking-[0.6em] text-[#088395] font-black uppercase italic">MarTwin_Cloud_Access</span>
          </div>
          <h1 className="text-5xl tracking-tighter text-white font-black uppercase italic leading-none">
            SQUAD <span className="text-[#FFB000] not-italic">ASSETS</span>
          </h1>
        </div>
        
        <label className="relative group overflow-hidden bg-[#FFB000] text-black px-10 py-4 rounded-none cursor-pointer transition-all hover:bg-white active:scale-95">
          <div className="flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase font-black italic">
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            {uploading ? "SYNCING..." : "ATTACH_ASSET"}
          </div>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </header>

      <div className="relative mb-16 max-w-4xl">
        <div className="relative flex items-center">
          <Search className="absolute left-6 text-[#088395]" size={20} />
          <input 
            type="text" 
            placeholder="// INJECT_QUERY..."
            className="w-full bg-black border border-[#088395]/30 rounded-none py-6 pl-16 pr-6 text-[12px] tracking-[0.2em] focus:border-[#FFB000] outline-none text-white uppercase italic"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDrive(search)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center py-40 border border-[#088395]/10 bg-black/40">
            <Loader2 className="animate-spin inline-block mb-6 text-[#088395]" size={40} />
            <div className="text-[12px] tracking-[0.8em] uppercase text-[#088395] font-black animate-pulse">Fetching_Nodes...</div>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              className="relative group cursor-pointer"
              onClick={() => window.open(file.webViewLink, '_blank')}
            >
              <div className="p-8 border border-white/5 bg-[#050505] relative flex flex-col justify-between h-48 transition-all group-hover:border-[#088395]/50 group-hover:bg-[#088395]/5">
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-black border border-[#088395]/30 text-[#088395] group-hover:text-[#FFB000] transition-all">
                    <FileText size={22} />
                  </div>
                  <ExternalLink size={18} className="text-zinc-800 group-hover:text-[#FFB000]" />
                </div>
                <div className="mt-6">
                  <h3 className="text-[13px] text-white font-black truncate uppercase tracking-widest mb-3 italic">
                    {file.name}
                  </h3>
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <p className="text-[9px] text-zinc-600 uppercase font-bold flex items-center gap-2">
                      <Activity size={10} className="text-[#088395]" /> 
                      REV: {new Date(file.modifiedTime).toLocaleDateString('es-AR')}
                    </p>
                    <Lock size={10} className="text-[#FFB000]" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}