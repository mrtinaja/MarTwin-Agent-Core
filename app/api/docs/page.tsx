"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, Edit3, Eye, Loader2, Code2, FileText, 
  Database, Zap, ArrowLeft, FolderUp, ScrollText, Settings 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

// Tipado para la estructura multicarpeta
interface DocEntry {
  name: string;
}

interface RepoData {
  migraciones: DocEntry[];
  cotizaciones: DocEntry[];
  tests: DocEntry[];
  prompts: DocEntry[];
}

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<RepoData>({
    migraciones: [],
    cotizaciones: [],
    tests: [],
    prompts: []
  });
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("SISTEMA_READY");
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"MD" | "HTML">("MD");
  
  // DESTINOS: Ahora incluye 'prompt'
  const [saveType, setSaveType] = useState<"migracion" | "cotizacion" | "test" | "prompt">("migracion");

  // CARGA DE REPOSITORIOS (Sincronizado con api/docs/read)
  const loadRepos = useCallback(async () => {
    try {
      setStatus("SCANNING_PIPELINE...");
      const res = await fetch(`/api/docs/read?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData({
          migraciones: json.migraciones || [],
          cotizaciones: json.cotizaciones || [],
          tests: json.tests || [],
          prompts: json.prompts || []
        });
        setStatus("REPOS_SINCRONIZADO");
      }
    } catch (err) {
      console.error("Error cargando repositorio:", err);
      setStatus("ERROR_SCAN_REPOS");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadRepos();
  }, [loadRepos]);

  // Recuperar archivo existente para editar
  const loadFileToEditor = async (fileName: string) => {
    setStatus("RECUPERANDO_OBJETO...");
    try {
      const res = await fetch(`/api/docs/read?name=${fileName}`);
      if (res.ok) {
        const fileData = await res.json();
        setTitle(fileName.split('.')[0]); 
        setContent(fileData.content || "");
        setStatus("OBJETO_EN_MEMORIA");
      }
    } catch (e) {
      setStatus("ERROR_RECUPERACION");
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setStatus("ERROR:_DATOS_INCOMPLETOS");
      return;
    }

    setIsSaving(true);
    setStatus("EJECUTANDO_PROTOCOLO...");

    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.toUpperCase().replace(/\s+/g, '_'), 
          content: content,
          type: saveType // Enviamos el tipo para el ruteo del backend
        }),
      });

      if (res.ok) {
        setStatus("ARCHIVADO_EXITOSAMENTE");
        await loadRepos();
        setTimeout(() => setStatus("SISTEMA_READY"), 2000);
      } else {
        setStatus("ERROR_DE_ESCRITURA");
      }
    } catch (err) {
      setStatus("ERROR_DE_CONEXIÓN");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 w-full p-8 bg-[#020202] min-h-screen font-mono text-zinc-400">
      <div className="max-w-[1700px] mx-auto">
        
        {/* HEADER QUIRÚRGICO */}
        <header className="mb-8 flex justify-between items-center border-b border-[#07514c]/20 pb-6">
          <div className="flex items-center gap-6">
            <Link href="/dev" className="text-[#07514c] hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-4">
              <Settings size={18} className="text-[#07514c] animate-spin-slow" />
              <h1 className="text-xl tracking-[0.5em] text-[#07514c] uppercase italic font-bold">MarTwin / CORE_EDITOR</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* SELECTOR DE DESTINO DINÁMICO */}
            <div className="flex items-center gap-2 bg-black border border-[#07514c]/50 p-1 rounded-sm">
              <FolderUp size={12} className="ml-2 text-[#07514c]" />
              <select 
                value={saveType}
                onChange={(e) => setSaveType(e.target.value as any)}
                className={`bg-transparent text-[10px] outline-none p-1 uppercase font-bold transition-colors ${saveType === 'prompt' ? 'text-amber-500' : 'text-[#07514c]'}`}
              >
                <option value="migracion">DESTINO: MIGRACIÓN (.MD)</option>
                <option value="cotizacion">DESTINO: COTIZACIÓN (.JSON)</option>
                <option value="test">DESTINO: QA/TESTING (.MD)</option>
                <option value="prompt">DESTINO: PROMPT MAESTRO (.MD)</option>
              </select>
            </div>

            {/* SELECTOR DE REPOSITORIO REAL */}
            <div className="flex items-center gap-2 bg-black border border-[#07514c]/30 p-1 rounded-sm">
              <Database size={12} className="ml-2 text-[#07514c]" />
              <select 
                onChange={(e) => loadFileToEditor(e.target.value)}
                className="bg-transparent text-[10px] text-[#07514c] outline-none p-1 uppercase w-48"
                value=""
              >
                <option value="" disabled>Abrir del Disco...</option>
                <optgroup label="📜 PROMPTS MAESTROS">
                  {data.prompts.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </optgroup>
                <optgroup label="📦 COTIZACIONES">
                  {data.cotizaciones.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </optgroup>
                <optgroup label="🛠️ MIGRACIONES">
                  {data.migraciones.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </optgroup>
                <optgroup label="🧪 TESTS">
                  {data.tests.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </optgroup>
              </select>
            </div>

            <div className={`text-[9px] uppercase tracking-widest ${status.includes('ERROR') ? 'text-red-500' : 'text-[#07514c]'}`}>
              [{status}]
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#07514c] text-black px-8 py-2 rounded-sm text-[9px] tracking-[0.3em] uppercase font-black hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(7,81,76,0.3)]"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              EJECUTAR_GUARDADO
            </button>
          </div>
        </header>

        {/* ÁREA DE TRABAJO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[78vh]">
          
          <div className="bg-[#050505] border border-[#07514c]/20 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#07514c]/10 bg-black flex justify-between items-center text-[#07514c]/60">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                    saveType === 'cotizacion' ? 'bg-purple-500' : 
                    saveType === 'test' ? 'bg-emerald-500' : 
                    saveType === 'prompt' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 
                    'bg-[#07514c]'
                }`} />
                <span className="text-[8px] tracking-widest uppercase italic font-bold">
                    Escritura: {saveType}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMode("MD")} className={`px-4 py-1 text-[8px] rounded transition-all ${mode === 'MD' ? 'bg-[#07514c]/20 text-[#07514c]' : ''}`}>MARKDOWN</button>
                <button onClick={() => setMode("HTML")} className={`px-4 py-1 text-[8px] rounded transition-all ${mode === 'HTML' ? 'bg-[#07514c]/20 text-[#07514c]' : ''}`}>HTML_UX</button>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-4 flex-1 bg-gradient-to-b from-transparent to-[#07514c]/5">
              <input 
                placeholder="ID_DEL_OBJETO"
                className="bg-black p-4 border border-[#07514c]/30 outline-none text-[#07514c] text-xs uppercase font-bold tracking-widest focus:border-[#07514c]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea 
                className="flex-1 bg-transparent p-4 text-[12px] leading-relaxed text-zinc-300 font-mono outline-none resize-none custom-scrollbar border border-white/5 focus:border-[#07514c]/20 rounded-lg"
                placeholder={saveType === 'prompt' ? "DEFINA LAS INSTRUCCIONES MAESTRAS..." : "COMIENCE EL PROTOCOLO..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-[#050505] border border-[#07514c]/20 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#07514c]/10 bg-black flex items-center gap-2 text-[#07514c]/60">
              <Eye size={12} /> <span className="text-[8px] tracking-widest uppercase italic">Output: Renderizado Core</span>
            </div>
            
            <div className="flex-1 overflow-auto bg-[#020202] custom-scrollbar">
              {mode === "MD" ? (
                <div className="p-10 prose prose-invert prose-sm max-w-none 
                  prose-headings:text-[#07514c] prose-headings:font-light prose-headings:uppercase prose-headings:tracking-widest
                  prose-strong:text-white prose-code:text-[#07514c] prose-hr:border-[#07514c]/20
                  prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/5">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <iframe 
                  srcDoc={content}
                  className="w-full h-full bg-white border-none" 
                  title="Preview UX"
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}