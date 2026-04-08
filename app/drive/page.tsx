"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { HardDrive, Search, Upload, ExternalLink, FileText, Loader2, Plus } from "lucide-react";

export default function DrivePage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  async function fetchDrive(query = "") {
    setLoading(true);
    const res = await fetch(`/api/drive/count?q=${query}`);
    const data = await res.json();
    setFiles(data.files || []);
    setLoading(false);
  }

  useEffect(() => { if (session) fetchDrive(); }, [session]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    await fetch('/api/drive/upload', { method: 'POST', body: formData });
    setUploading(false);
    fetchDrive(); // Recargar lista
  };

  return (
    <div className="p-12 min-h-screen bg-[#020202] text-zinc-300 font-extralight font-mono">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl tracking-tighter text-white uppercase italic mb-2">
            NUBE <span className="text-[#08646E] font-normal">Squad</span>
          </h1>
          <p className="text-[10px] tracking-[0.5em] text-[#08646E]/60 uppercase">Terminal de Archivos Laborales</p>
        </div>
        
        {/* Botón de Upload */}
        <label className="flex items-center gap-2 bg-[#08646E] text-white px-6 py-3 rounded-full cursor-pointer hover:bg-[#0a808c] transition-all text-[10px] tracking-widest uppercase font-bold">
          {uploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          {uploading ? "Subiendo..." : "Adjuntar Archivo"}
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </header>

      {/* Buscador */}
      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
        <input 
          type="text" 
          placeholder="BUSCAR EN DRIVE LABORAL..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-[#08646E] outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchDrive(search)}
        />
      </div>

      {/* Lista de Archivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-20 opacity-50 italic">Sincronizando con Google Cloud...</div>
        ) : files.map((file) => (
          <div key={file.id} className="p-5 border border-white/5 bg-white/[0.02] rounded-2xl flex items-center justify-between group hover:border-[#08646E]/40 transition-all">
            <div className="flex items-center gap-4">
              <FileText className="text-zinc-500 group-hover:text-[#08646E]" size={20} />
              <div>
                <h3 className="text-xs text-white truncate max-w-[250px]">{file.name}</h3>
                <p className="text-[9px] text-zinc-600 uppercase">Modificado: {new Date(file.modifiedTime).toLocaleDateString()}</p>
              </div>
            </div>
            <a href={file.webViewLink} target="_blank" rel="noreferrer" className="p-2 hover:bg-[#08646E]/20 rounded-lg">
              <ExternalLink size={14} className="text-zinc-600 group-hover:text-white" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}