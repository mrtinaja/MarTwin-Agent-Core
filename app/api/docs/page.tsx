"use client";

import { useState, useEffect, useCallback } from 'react';
import { Terminal, Edit3, Eye, Loader2, Code2, FileText, Database, Zap, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

// DATA REAL DE LOS 32 REPORTES (Templates)
const v1Reports = Array.from({ length: 32 }, (_, i) => ({
  id: `ZUR-V1-${String(i + 1).padStart(2, '0')}`,
  name: `REPORT_ORACLE_FIN_${100 + i}_MIG`,
  tech: "PL/SQL -> NEXT.JS",
  status: "COMPLETED"
}));

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("SISTEMA_READY");
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"MD" | "HTML">("MD");

  // FUNCIÓN DE CARGA CORREGIDA: Apunta a /api/docs/read
  const loadReports = useCallback(async () => {
    try {
      setStatus("SCANNING_REPOS...");
      const res = await fetch(`/api/docs/read?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Tomamos los documentos reales del disco
        setReports(data.docs || []);
        setStatus("REPOS_SINCRONIZADO");
      }
    } catch (err) {
      console.error("Error cargando repositorio:", err);
      setStatus("ERROR_SCAN_REPOS");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadReports();
  }, [loadReports]);

  const injectTemplate = async (reportValue: string) => {
    setStatus("PROCESANDO_SOLICITUD...");
    
    // 1. BUSCAMOS SI ES UN TEMPLATE V1
    const templateV1 = v1Reports.find(r => r.id === reportValue);
    
    if (templateV1) {
      setTitle(`MINUTA_TECNICA_${templateV1.name}`);
      const template = `# 🛠️ PROTOCOLO DE MIGRACIÓN: ${templateV1.name}\n**ID_SQUAD:** ${templateV1.id}\n**ESTADO:** ${templateV1.status}\n**TECNOLOGÍA:** ${templateV1.tech}\n\n---\n\n## 📋 RESUMEN OPERATIVO\nSe confirma la migración exitosa del objeto legacy **Oracle PL/SQL** hacia la arquitectura **MarTwin Next.js**.\n\n## ⚙️ ESPECIFICACIONES DE MAPEO\n- **Fuente:** Oracle Database 19c\n- **Destino:** Next.js API Routes / JSON Output\n---\n*Documento generado por MarTwin Systems Core*`;
      setContent(template);
      setStatus("TEMPLATE_V1_INYECTADO");
      return;
    }

    // 2. BUSCAMOS ARCHIVO REAL EN DISCO
    setStatus("RECUPERANDO_DATA_DISCO...");
    try {
      // Llamamos a la API de lectura enviando el nombre por query
      const res = await fetch(`/api/docs/read?name=${reportValue}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(reportValue);
        setContent(data.content || "");
        setStatus("OBJETO_SINCRONIZADO");
      } else {
        setStatus("ARCHIVO_NO_ENCONTRADO");
      }
    } catch (e) {
      setStatus("ERROR_DE_CONEXIÓN");
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setStatus("ERROR:_DATOS_INCOMPLETOS");
      return;
    }

    setIsSaving(true);
    setStatus("EJECUTANDO_ESCRITURA_FS...");

    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.toUpperCase().replace(/\s+/g, '_'), 
          content: content,
          tech: "PL/SQL -> NEXT.JS" 
        }),
      });

      if (res.ok) {
        setStatus("SISTEMA_ACTUALIZADO");
        alert("PROTOCOLO ARCHIVADO: Guardado con éxito.");
        await loadReports();
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
      <div className="max-w-[1600px] mx-auto">
        
        <header className="mb-8 flex justify-between items-center border-b border-[#07514c]/20 pb-6">
          <div className="flex items-center gap-6">
            <Link href="/dev" className="text-[#07514c] hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-4">
              <Terminal size={18} className="text-[#07514c]" />
              <h1 className="text-xl tracking-[0.5em] text-[#07514c] uppercase italic">MarTwin / CORE_EDITOR</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black border border-[#07514c]/30 p-1 rounded-sm">
              <Database size={12} className="ml-2 text-[#07514c]" />
              <select 
                onChange={(e) => injectTemplate(e.target.value)}
                className="bg-transparent text-[10px] text-[#07514c] outline-none p-1 uppercase"
                value=""
              >
                <option value="" disabled>Seleccionar Objeto</option>
                <optgroup label="REPOSITORIO REAL (.MD)">
                  {reports.map((r: any) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="TEMPLATES V1">
                  {v1Reports.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex bg-black p-1 rounded-sm border border-[#07514c]/30">
              <button 
                onClick={() => setMode("MD")}
                className={`px-4 py-1 text-[8px] flex items-center gap-2 transition-all ${mode === 'MD' ? 'bg-[#07514c] text-white' : ''}`}
              >
                <FileText size={10} /> MD_AI
              </button>
              <button 
                onClick={() => setMode("HTML")}
                className={`px-4 py-1 text-[8px] flex items-center gap-2 transition-all ${mode === 'HTML' ? 'bg-[#07514c] text-black bg-opacity-50 border border-[#07514c]' : ''}`}
              >
                <Code2 size={10} /> HTML_UX
              </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[75vh]">
          
          {/* EDITOR */}
          <div className="bg-[#050505] border border-[#07514c]/20 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#07514c]/10 bg-black flex justify-between items-center text-[#07514c]/60">
              <div className="flex items-center gap-2">
                <Edit3 size={12} /> 
                <span className="text-[8px] tracking-widest uppercase italic">Input: {mode === 'MD' ? 'Markdown Engineering' : 'HTML Architecture'}</span>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4 flex-1">
              <input 
                placeholder="ID_DOCUMENTO"
                className="bg-black p-3 border border-[#07514c]/30 outline-none text-[#07514c] text-xs uppercase placeholder:text-[#07514c]/10 font-bold tracking-widest"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea 
                className="flex-1 bg-transparent p-2 text-[11px] leading-relaxed text-zinc-400 font-mono outline-none resize-none custom-scrollbar border border-[#07514c]/5 focus:border-[#07514c]/30"
                placeholder={mode === 'MD' ? "WRITE_MARKDOWN_HERE..." : "INSERT_HTML_CODE..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          {/* VISTA PREVIA */}
          <div className="bg-[#050505] border border-[#07514c]/20 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#07514c]/10 bg-black flex items-center gap-2 text-[#07514c]/60">
              <Eye size={12} /> <span className="text-[8px] tracking-widest uppercase italic">Output: Renderizado Core</span>
            </div>
            
            <div className="flex-1 overflow-auto bg-black">
              {mode === "MD" ? (
                <div className="p-8 prose prose-invert prose-xs max-w-none prose-headings:text-[#07514c] prose-headings:font-light prose-strong:text-white prose-code:text-[#07514c] prose-hr:border-[#07514c]/20">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <iframe 
                  srcDoc={content}
                  className="w-full h-full bg-white" 
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