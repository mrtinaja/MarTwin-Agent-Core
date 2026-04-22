"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, Edit3, Eye, Loader2, Code2, FileText, 
  Database, Zap, ArrowLeft, CheckCircle, Activity, Settings, 
  ScrollText, Cpu, ShieldAlert, Binary
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

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
  const [status, setStatus] = useState("CORE_READY");
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"MD" | "HTML">("MD");
  const [saveType, setSaveType] = useState<"migracion" | "cotizacion" | "test" | "prompt">("migracion");

  const loadRepos = useCallback(async () => {
    try {
      setStatus("INJECTING_SCANNER...");
      const res = await fetch(`/api/docs/read?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData({
          migraciones: json.migraciones || [],
          cotizaciones: json.cotizaciones || [],
          tests: json.tests || [],
          prompts: json.prompts || []
        });
        setStatus("REPOS_SYNCED_OK");
      }
    } catch (err) {
      setStatus("SCAN_FAILURE_RETRY");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadRepos();
  }, [loadRepos]);

  const loadFileToEditor = async (fileName: string) => {
    setStatus("DOWNLOADING_BUFFER...");
    try {
      const res = await fetch(`/api/docs/read?name=${fileName}`);
      if (res.ok) {
        const fileData = await res.json();
        setTitle(fileName.split('.')[0]); 
        setContent(fileData.content || "");
        setStatus("BUFFER_LOADED");
      }
    } catch (e) {
      setStatus("CRITICAL_RECOVERY_ERROR");
    }
  };

  const handleSave = async () => {
    if(!title || !content) return setStatus("INVALID_DATA_STREAM");
    setIsSaving(true);
    setStatus("UPLOADING_ENCRYPTED...");
    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.toUpperCase().replace(/\s+/g, '_'), 
          content: content,
          type: saveType 
        }),
      });
      if(res.ok) {
        setStatus("DECODED_AND_SAVED");
        loadRepos();
      }
    } catch (err) {
      setStatus("UPLINK_BROKEN");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 w-full p-6 bg-[#000000] min-h-screen font-mono text-zinc-500 selection:bg-[#00ffcc] selection:text-black">
      {/* OVERLAY DE SCANLINE (Efecto Retro-Futurista) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50"></div>

      <div className="max-w-[1800px] mx-auto relative z-10">
        
        {/* HEADER: NEURAL LINK INTERFACE */}
        <header className="mb-10 flex justify-between items-center border-b-2 border-[#00ffcc]/10 pb-8 relative">
          <div className="flex items-center gap-8">
            <Link href="/dev" className="group relative p-2 border border-[#00ffcc]/20 hover:border-[#00ffcc] hover:bg-[#00ffcc]/10 transition-all duration-300">
              <ArrowLeft size={24} className="text-[#00ffcc] group-hover:-translate-x-1 transition-transform" />
              <div className="absolute -inset-1 bg-[#00ffcc]/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Cpu size={16} className="text-[#00ffcc] animate-pulse" />
                <span className="text-[10px] tracking-[0.4em] text-[#00ffcc]/60 uppercase">Neural Pipeline v4.0.2</span>
              </div>
              <h1 className="text-3xl tracking-tighter text-white font-black uppercase italic">
                MarTwin <span className="text-[#00ffcc] drop-shadow-[0_0_8px_#00ffcc]">SYS_EDITOR</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* DESTINATION SECTOR */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] text-[#00ffcc]/50 uppercase tracking-widest text-right">Destination Sector</span>
              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#00ffcc]/30 p-2 rounded-sm shadow-[inset_0_0_10px_rgba(0,255,204,0.1)]">
                <Binary size={14} className="text-[#00ffcc]" />
                <select 
                  value={saveType}
                  onChange={(e) => setSaveType(e.target.value as any)}
                  className="bg-transparent text-[11px] outline-none uppercase font-black text-[#00ffcc] cursor-pointer"
                >
                  <option className="bg-black" value="cotizacion">📂 MODULE: QUOTE.JSON</option>
                  <option className="bg-black" value="migracion">📂 MODULE: MIGRATION.MD</option>
                  <option className="bg-black" value="test">📂 MODULE: QA_PROTOCOL.MD</option>
                  <option className="bg-black" value="prompt">📜 MODULE: MASTER_PROMPT.MD</option>
                </select>
              </div>
            </div>

            {/* DISK ACCESS */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest text-right">Local Disk Access</span>
              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 p-2 rounded-sm">
                <Database size={14} className="text-zinc-500" />
                <select 
                  onChange={(e) => loadFileToEditor(e.target.value)}
                  className="bg-transparent text-[11px] text-zinc-400 outline-none uppercase w-56 font-bold"
                  value=""
                >
                  <option className="bg-black" value="" disabled>READ_MEMORY_STREAM...</option>
                  <optgroup className="bg-black text-[#00ffcc]" label="--- MASTER PROMPTS ---">
                    {data.prompts.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </optgroup>
                  <optgroup className="bg-black text-purple-400" label="--- QUOTES ---">
                    {data.cotizaciones.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </optgroup>
                  <optgroup className="bg-black text-blue-400" label="--- MIGRATIONS ---">
                    {data.migraciones.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </optgroup>
                  <optgroup className="bg-black text-emerald-400" label="--- QA PROTOCOLS ---">
                    {data.tests.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* ACTION TRIGGER */}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="relative group h-12 overflow-hidden bg-transparent border-2 border-[#00ffcc] px-10 py-2 transition-all duration-300 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-[#00ffcc] translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative flex items-center gap-3 z-10 text-[#00ffcc] group-hover:text-black font-black text-xs tracking-tighter uppercase">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                UPLOAD_DATA_STREAM
              </div>
            </button>
          </div>
        </header>

        {/* STATUS BAR INFRASTRUCTURE */}
        <div className="flex gap-4 mb-4 items-center">
            <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#00ffcc]/20 to-transparent"></div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
                <Activity size={12} className="text-[#00ffcc] animate-pulse" />
                <span className="text-zinc-600 uppercase tracking-widest">STATUS:</span>
                <span className={`uppercase ${status.includes('ERROR') ? 'text-red-500' : 'text-[#00ffcc]'}`}>
                    {status}
                </span>
            </div>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-[#00ffcc]/20 to-transparent"></div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[74vh]">
          
          {/* EDITOR: RAW DATA INPUT */}
          <div className="bg-[#050505] border-2 border-[#00ffcc]/5 rounded-none flex flex-col overflow-hidden group hover:border-[#00ffcc]/20 transition-colors relative">
            <div className="absolute top-0 right-0 p-2 text-[10px] text-white/5 font-black">X-DATA-INPUT</div>
            <div className="p-4 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-none skew-x-12 ${
                  saveType === 'cotizacion' ? 'bg-purple-600 shadow-[0_0_10px_#7c3aed]' : 
                  saveType === 'test' ? 'bg-emerald-600 shadow-[0_0_10px_#10b981]' : 
                  saveType === 'prompt' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 
                  'bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]'
                }`} />
                <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400">
                  Input Stream: {saveType}
                </span>
              </div>
              <div className="flex bg-black p-1 border border-white/5">
                <button onClick={() => setMode("MD")} className={`px-4 py-1 text-[9px] font-bold transition-all ${mode === 'MD' ? 'bg-[#00ffcc] text-black' : 'text-zinc-600 hover:text-white'}`}>MARKDOWN</button>
                <button onClick={() => setMode("HTML")} className={`px-4 py-1 text-[9px] font-bold transition-all ${mode === 'HTML' ? 'bg-[#00ffcc] text-black' : 'text-zinc-600 hover:text-white'}`}>HTML_RENDER</button>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-6 flex-1 bg-[radial-gradient(circle_at_bottom_left,rgba(0,255,204,0.02),transparent)]">
              <div className="relative">
                <input 
                  placeholder="FILE_IDENTIFIER_NAMING..."
                  className="w-full bg-black/50 p-4 border-l-4 border-[#00ffcc] outline-none text-[#00ffcc] text-sm uppercase font-black tracking-widest focus:bg-black transition-all placeholder:text-zinc-800"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex-1 relative">
                <textarea 
                  className="w-full h-full bg-transparent p-4 text-[13px] leading-relaxed text-zinc-300 font-mono outline-none resize-none custom-scrollbar border border-white/5 focus:border-[#00ffcc]/30 transition-all placeholder:text-zinc-900"
                  placeholder={saveType === 'prompt' ? ">> INJECT MASTER INSTRUCTIONS FOR AI AGENT..." : ">> BEGIN DOCUMENTATION PROTOCOL..."}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* PREVIEW: VISUAL OUTPUT */}
          <div className="bg-[#050505] border-2 border-[#00ffcc]/5 rounded-none flex flex-col overflow-hidden shadow-2xl relative">
            <div className="absolute bottom-0 right-0 p-2 text-[10px] text-white/5 font-black">PREVIEW-SUBSYSTEM</div>
            <div className="p-4 border-b border-white/5 bg-zinc-950/50 flex items-center gap-3 text-zinc-500">
              <Eye size={14} className="text-[#00ffcc]" /> 
              <span className="text-[10px] tracking-[0.3em] uppercase font-bold">Encrypted Visualization</span>
            </div>
            
            <div className="flex-1 overflow-auto bg-[#020202] custom-scrollbar p-1">
              {mode === "MD" ? (
                <div className="p-10 prose prose-invert prose-sm max-w-none 
                  prose-headings:text-[#00ffcc] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest
                  prose-strong:text-[#00ffcc] prose-code:text-amber-400 prose-hr:border-[#00ffcc]/20
                  prose-pre:bg-black/50 prose-pre:border prose-pre:border-[#00ffcc]/10 prose-pre:rounded-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <iframe 
                  srcDoc={content}
                  className="w-full h-full bg-white opacity-90 invert grayscale hover:grayscale-0 hover:invert-0 transition-all duration-700" 
                  title="UX Rendering"
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}