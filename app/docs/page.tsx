"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, Cpu, Database, Zap, Activity, Eye, Loader2, Save, Terminal, FileCode 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface DocEntry { name: string; }
interface RepoData { migraciones: DocEntry[]; cotizaciones: DocEntry[]; tests: DocEntry[]; prompts: DocEntry[]; }

export default function DocsPage() {
  const sessionContext = useSession();
  const session = sessionContext?.data;

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<RepoData>({ migraciones: [], cotizaciones: [], tests: [], prompts: [] });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("CORE_READY");
  const [savePath, setSavePath] = useState("documentacion/test/"); // <-- Recuperamos el input de destino
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"MD" | "HTML">("MD");

  const loadRepos = useCallback(async () => {
    if (!session) return;
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
    } catch (err) { setStatus("SCAN_FAILURE"); }
  }, [session]);

  useEffect(() => {
    setMounted(true);
    if (session) loadRepos();
  }, [loadRepos, session]);

  const loadFileToEditor = async (fileName: string) => {
    setStatus("DOWNLOADING_BUFFER...");
    try {
      const res = await fetch(`/api/docs/read?name=${fileName}`);
      if (res.ok) {
        const fileData = await res.json();
        setTitle(fileName); 
        setContent(fileData.content || "");
        // Intentamos autodetectar la carpeta para el savePath
        if (fileName.includes('.js')) setSavePath("documentacion/test/");
        if (fileName.includes('.md')) setSavePath("documentacion/prompts/");
        setStatus("BUFFER_LOADED");
      }
    } catch (e) { setStatus("CRITICAL_ERROR"); }
  };

  const handleSave = async () => {
    if (!title) return setStatus("ERROR: NO_FILENAME");
    setIsSaving(true);
    setStatus("UPLOADING_TO_TOSHIBA...");
    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: `${savePath}${title.includes('.') ? title : title + '.js'}`, 
          content 
        })
      });
      if (res.ok) setStatus("PERSISTENCE_SUCCESS");
      else setStatus("SAVE_FAILED");
    } catch (e) { setStatus("UPLINK_ERROR"); }
    finally { setIsSaving(false); }
  };

  const generateSimulatedHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #f0f0f0; margin: 0; padding: 20px; font-family: 'Courier New', monospace; }
          .paper { background: white; width: 270mm; min-height: 210mm; padding: 15mm; margin: auto; box-shadow: 0 0 20px rgba(0,0,0,0.2); position: relative; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { border-bottom: 2px solid #000; padding: 5px; font-size: 10px; text-align: left; background: #eee; text-transform: uppercase; }
          td { border-bottom: 1px solid #ddd; padding: 4px; font-size: 9px; }
          .money { text-align: right; font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }
          .header-mock { border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="paper">
          <div id="render-root">
             <p style="color:#088395">INICIALIZANDO_MOTOR_GRAFICO_V5...</p>
          </div>
        </div>
        <script>
          const raw = \`${content.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
          function getLayout(code) {
            const match = code.match(/layout:\\s*[\`']([\\s\\S]*?)[\`']/);
            return match ? match[1] : '<h2>ERROR: No se encontró el bloque "layout"</h2>';
          }
          function getAnyColumns(code, queryName) {
            const queryPart = code.split(queryName)[1] || "";
            const colRegex = /"([^"]+\\|[^"]+)"/g;
            let cols = [];
            let m;
            const limit = queryPart.indexOf('\`');
            const searchZone = limit > -1 ? queryPart.substring(0, limit) : code;
            while ((m = colRegex.exec(searchZone)) !== null) {
              if (m[1].includes('|')) cols.push(m[1]);
            }
            if (cols.length === 0) {
              const generalRegex = /"([^"]+\\|[^"]+)"/g;
              while ((m = generalRegex.exec(code)) !== null) {
                if (m[1].includes('|')) cols.push(m[1]);
              }
            }
            return [...new Set(cols)];
          }
          function mock(alias) {
            if (alias.includes('money')) return (Math.random() * 9000).toLocaleString('es-AR', {minimumFractionDigits:2});
            if (alias.includes('date')) return new Date().toLocaleDateString('es-AR');
            if (alias.includes('int')) return Math.floor(Math.random() * 1000).toString();
            return "VAL_" + Math.floor(Math.random() * 99);
          }
          try {
            let html = getLayout(raw);
            html = html.replace(/#\\[(.*?)\\]#/g, (match, qName) => {
                const columns = getAnyColumns(raw, qName);
                if (columns.length === 0) return "<tr><td colspan='5'>FALLO_SCAN_COLUMNAS</td></tr>";
                let tableRows = "<thead><tr>";
                columns.forEach(c => tableRows += \`<th>\${c.split('|')[0]}</th>\`);
                tableRows += "</tr></thead><tbody>";
                for(let i=0; i<8; i++) {
                  tableRows += "<tr>";
                  columns.forEach(c => {
                    const [_, type, align] = c.split('|');
                    tableRows += \`<td class="\${align || ''} \${type || ''}">\${mock(c)}</td>\`;
                  });
                  tableRows += "</tr>";
                }
                tableRows += "</tbody>";
                return tableRows;
            });
            html = html.replace(/#\\{(.*?)\\}#/g, (m, f) => mock(f));
            document.getElementById('render-root').innerHTML = html;
          } catch(e) {
            document.getElementById('render-root').innerHTML = "RENDER_CRITICAL: " + e.message;
          }
        </script>
      </body>
      </html>
    `;
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="flex-1 w-full p-6 bg-[#020202] min-h-screen font-mono text-zinc-500 relative">
      {/* SCANLINE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(8,131,149,0.06),rgba(255,176,0,0.02))] bg-[length:100%_2px,3px_100%]"></div>

      <div className="max-w-[1900px] mx-auto relative z-10">
        <header className="mb-6 flex justify-between items-center border-b-2 border-[#088395]/20 pb-6">
          <div className="flex items-center gap-6">
            <Link href="/dev" className="p-2 border border-[#088395]/30 hover:border-[#088395] hover:bg-[#088395]/10 transition-all text-[#088395]">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl text-white font-black uppercase italic tracking-tighter">
                SYS_<span className="text-[#088395]">AUDITOR_VISOR</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Activity size={10} className={isSaving ? "text-[#FFB000] animate-spin" : "text-[#088395]"} />
                <span className={`text-[8px] font-bold tracking-widest ${isSaving ? "text-[#FFB000]" : "text-[#088395]/60"}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* INPUT DE DESTINO (RECUPERADO) */}
            <div className="flex items-center bg-black border border-white/10 px-3 py-2">
              <Save size={12} className="text-[#FFB000] mr-3" />
              <input 
                type="text" 
                value={savePath} 
                onChange={(e) => setSavePath(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] text-[#FFB000] w-64 font-bold uppercase tracking-widest"
                placeholder="TARGET_PATH..."
              />
            </div>

            <select 
              onChange={(e) => loadFileToEditor(e.target.value)} 
              className="bg-[#0a0a0a] border border-white/10 p-2 text-[10px] text-zinc-400 outline-none uppercase w-64 hover:border-[#088395] transition-colors"
              value=""
            >
              <option value="" disabled>READ_MEMORY_STREAM...</option>
              <optgroup className="bg-black text-[#088395]" label="--- TESTS / JS MODELS ---">
                {data.tests?.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </optgroup>
              <optgroup className="bg-black text-[#FFB000]" label="--- MIGRATIONS ---">
                {data.migraciones?.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </optgroup>
            </select>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 border-2 border-[#088395] px-8 text-[#088395] hover:bg-[#088395] hover:text-black font-black text-[10px] transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              SAVE_AND_SYNC
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[78vh]">
          {/* EDITOR SECTION */}
          <div className="bg-[#050505] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileCode size={12} className="text-[#088395]" />
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] uppercase font-black text-white/80 w-64"
                  placeholder="FILENAME.js"
                />
              </div>
              <div className="flex bg-black p-1 border border-white/10">
                <button onClick={() => setMode("MD")} className={`px-4 py-1 text-[9px] font-black transition-all ${mode === 'MD' ? 'bg-[#088395] text-white' : 'text-zinc-600'}`}>DOC</button>
                <button onClick={() => setMode("HTML")} className={`px-4 py-1 text-[9px] font-black transition-all ${mode === 'HTML' ? 'bg-[#FFB000] text-black' : 'text-zinc-600'}`}>MOCK_RENDER</button>
              </div>
            </div>
            <textarea 
              className="w-full h-full bg-transparent p-6 text-[12px] text-[#088395]/90 font-mono outline-none resize-none custom-scrollbar leading-relaxed selection:bg-[#088395] selection:text-white" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              spellCheck={false}
            />
          </div>

          {/* PREVIEW SECTION */}
          <div className="bg-[#050505] border border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-2 z-20">
               <div className={`h-1.5 w-1.5 rounded-full ${mode === 'HTML' ? 'bg-[#FFB000] shadow-[0_0_10px_#FFB000]' : 'bg-[#088395] shadow-[0_0_10px_#088395]'} animate-pulse`}></div>
            </div>
            <div className="flex-1 overflow-auto bg-[#020202]">
              {mode === "MD" ? (
                <div className="p-10 prose prose-invert max-w-none prose-p:text-zinc-400 prose-headings:text-white prose-code:text-[#088395]">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <iframe srcDoc={generateSimulatedHTML()} className="w-full h-full bg-white transition-all duration-700" title="UX Rendering" />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #08839544; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}