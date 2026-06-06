"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Zap, Activity, Loader2, Save, FileCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { workspaceSectionList } from '@/src/lib/workspaceProfile';

interface DocEntry { name: string; }
type RepoData = Record<string, DocEntry[]>;

export default function DocsPage() {
  const sessionContext = useSession();
  const session = sessionContext?.data;

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<RepoData>({ requirements: [], workItems: [], qa: [], knowledge: [], prompts: [] });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("SISTEMA_LISTO");
  const [saveType, setSaveType] = useState("work");
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"MD" | "HTML">("MD");

  const loadRepos = useCallback(async () => {
    if (!session) return;
    try {
      setStatus("ESCANEANDO_REPOSITORIOS...");
      const res = await fetch(`/api/docs/read?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData({
          requirements: json.requirements || json.cotizaciones || [],
          workItems: json.workItems || json.migrations || [],
          qa: json.qa || json.tests || [],
          knowledge: json.knowledge || [],
          prompts: json.prompts || [],
        });
        setStatus("REPOSITORIOS_SINCRONIZADOS");
      }
    } catch (err) {
      setStatus("ERROR_DE_ESCANEO");
    }
  }, [session]);

  useEffect(() => {
    setMounted(true);
    if (session) loadRepos();
  }, [loadRepos, session]);

  const loadFileToEditor = async (fileName: string) => {
    setStatus("CARGANDO_ARCHIVO...");
    try {
      const res = await fetch(`/api/docs/read?name=${fileName}`);
      if (res.ok) {
        const fileData = await res.json();
        setTitle(fileName);
        setContent(fileData.content || "");
        if (fileName.includes('.js') || fileName.includes('.ts')) setSaveType("work");
        if (fileName.includes('.md')) setSaveType("knowledge");
        if (fileName.includes('.json')) setSaveType("requirements");
        setStatus("ARCHIVO_CARGADO");
      }
    } catch (e) {
      setStatus("ERROR_CRITICO");
    }
  };

  const handleSave = async () => {
    if (!title) return setStatus("ERROR: SIN_NOMBRE");
    setIsSaving(true);
    setStatus("PERSISTIENDO_DATOS...");
    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: saveType, content }),
      });
      if (res.ok) {
        setStatus("GUARDADO_EXITOSO");
        loadRepos();
      } else {
        setStatus("FALLO_AL_GUARDAR");
      }
    } catch (e) {
      setStatus("ERROR_DE_GUARDADO");
    } finally {
      setIsSaving(false);
    }
  };

  const generateSimulatedHTML = () => {
    const escaped = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #f8fafc; margin: 0; padding: 40px; font-family: Inter, sans-serif; color: #1e1248; }
          .paper { background: white; width: 210mm; min-height: 297mm; padding: 25mm; margin: auto; border-radius: 12px; box-shadow: 0 10px 50px rgba(30,18,72,0.1); border: 1px solid #e2e8f0; }
          pre { white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="paper"><pre>${escaped}</pre></div>
      </body>
      </html>
    `;
  };

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="flex-1 w-full p-8 bg-gray-50 min-h-screen font-sans text-[#1e1248] relative selection:bg-[#e50051]/10">
      <div className="max-w-[1800px] mx-auto relative z-10">
        <header className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-6">
            <Link href="/dev" className="p-3 rounded-2xl bg-gray-50 text-[#1e1248] hover:bg-[#e50051] hover:text-white transition-all shadow-sm">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-normal uppercase tracking-tighter">
                Centro de <span className="text-[#e50051]">Documentacion</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Activity size={14} className={isSaving ? "text-[#e50051] animate-spin" : "text-green-500"} />
                <span className="text-[10px] font-normal tracking-widest text-gray-400 uppercase">
                  Status: <span className="text-[#1e1248]">{status}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 flex-1 xl:flex-none">
              <Save size={14} className="text-[#e50051] mr-3" />
              <select
                value={saveType}
                onChange={(e) => setSaveType(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] text-[#1e1248] w-full xl:w-64 font-normal uppercase tracking-tight"
              >
                <option value="requirements">Requerimiento / Input</option>
                <option value="work">Desarrollo / Artefacto</option>
                <option value="qa">QA / Evidencia</option>
                <option value="knowledge">Conocimiento</option>
                <option value="prompt">Prompt</option>
              </select>
            </div>

            <select
              onChange={(e) => loadFileToEditor(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl p-2.5 text-[11px] text-[#1e1248] font-normal outline-none uppercase w-full xl:w-64 cursor-pointer hover:border-[#1e1248] transition-colors shadow-sm"
              value=""
            >
              <option value="" disabled>Seleccionar archivo...</option>
              {workspaceSectionList.map(section => (
                <optgroup key={section.key} label={section.title.toUpperCase()}>
                  {(data[section.key] || []).map(r => (
                    <option key={`${section.key}-${r.name}`} value={r.name}>{r.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-12 bg-[#1e1248] px-8 text-white rounded-2xl hover:bg-[#e50051] font-normal text-xs transition-all flex items-center gap-3 disabled:opacity-50 shadow-lg shadow-[#1e1248]/10 active:scale-95"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              GUARDAR Y SINCRONIZAR
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[75vh]">
          <div className="bg-[#1e1248] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl border border-[#1e1248]">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileCode size={16} className="text-[#e50051]" />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-normal text-white/90 w-full placeholder:text-white/20"
                  placeholder="NOMBRE_ARCHIVO.md"
                />
              </div>
              <div className="flex bg-black/30 p-1 rounded-xl">
                <button onClick={() => setMode("MD")} className={`px-5 py-1.5 rounded-lg text-[10px] font-normal transition-all ${mode === 'MD' ? 'bg-[#e50051] text-white' : 'text-white/40 hover:text-white'}`}>MARKDOWN</button>
                <button onClick={() => setMode("HTML")} className={`px-5 py-1.5 rounded-lg text-[10px] font-normal transition-all ${mode === 'HTML' ? 'bg-[#e50051] text-white' : 'text-white/40 hover:text-white'}`}>PREVIEW</button>
              </div>
            </div>
            <textarea
              className="w-full h-full bg-transparent p-8 text-[13px] text-gray-300 font-mono outline-none resize-none custom-scrollbar leading-relaxed selection:bg-[#e50051] selection:text-white"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="// Escribe aqui codigo, documentacion, evidencia o decisiones tecnicas..."
            />
          </div>

          <div className="bg-white rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl border border-gray-100 relative">
            <div className="absolute top-6 right-6 z-20">
              <div className={`h-2 w-2 rounded-full ${mode === 'HTML' ? 'bg-[#e50051]' : 'bg-[#1e1248]'} animate-pulse shadow-lg`} />
            </div>
            <div className="flex-1 overflow-auto bg-gray-50/50">
              {mode === "MD" ? (
                <div className="p-12 prose prose-slate max-w-none prose-p:text-[#1e1248]/80 prose-headings:text-[#1e1248] prose-headings:font-normal prose-code:text-[#e50051] prose-strong:text-[#1e1248] prose-img:rounded-3xl">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <iframe srcDoc={generateSimulatedHTML()} className="w-full h-full border-none transition-all duration-700" title="Technical Preview" />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(30,18,72,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e50051; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
