"use client";
export const dynamic = "force-dynamic";

import { useChat } from 'ai/react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  BrainCircuit, Activity, Database, FileText, X, 
  Terminal, Zap, Copy, Check, Radio, Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Componente de Bloque de Código con Feedback de Copiado
const CodeBlock = ({ language, value, onCopy, copiedId, blockId }: any) => {
  return (
    <div className="relative my-4 border border-[#e4b32b]/20 rounded-sm overflow-hidden bg-black shadow-2xl group">
      <div className="bg-[#0a0a0a] px-3 py-1 border-b border-[#e4b32b]/10 text-[8px] text-[#e4b32b]/40 font-bold uppercase flex justify-between items-center">
        <span className="flex items-center gap-2"><Terminal size={10} /> {language || 'code'} output</span>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Evita que el click global robe el foco antes de copiar
            onCopy(value, blockId);
          }}
          className="flex items-center gap-1.5 hover:text-[#e4b32b] transition-colors bg-[#e4b32b]/5 px-2 py-0.5 rounded border border-[#e4b32b]/10 active:scale-95"
        >
          {copiedId === blockId ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
          {copiedId === blockId ? 'BLOCK_STORED' : 'COPY_TO_CLIP'}
        </button>
      </div>
      <SyntaxHighlighter 
        style={atomDark} 
        language={language} 
        PreTag="div" 
        customStyle={{ margin: 0, background: 'transparent', padding: '1.25rem', fontSize: '10px' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default function ChatPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  useEffect(() => { 
    setMounted(true);
    // Foco inicial
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [{ 
      id: 'init', 
      role: 'assistant', 
      content: 'MARTWIN_CORE_V5: Conexión establecida. Protocolos de orquestación de datos activos. El cursor está vinculado a tu voluntad, Operador.' 
    }],
  });

  // Mantener el foco cuando termina de escribir la IA
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  // Función para forzar el foco al hacer click en cualquier parte
  const forceFocus = () => {
    inputRef.current?.focus();
  };

  const handleCopy = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedBlockId(id);
      setTimeout(() => setCopiedBlockId(null), 2000);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!mounted) return <div className="h-screen bg-[#020202]" />;

  return (
    <div 
      onClick={forceFocus}
      className="flex flex-col h-screen bg-[#020202] text-[#e4b32b]/60 font-mono overflow-hidden relative cursor-default"
    >
      {/* SCANLINE EFFECT */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(8,100,110,0.02),rgba(228,179,43,0.02))] bg-[length:100%_4px,4px_100%]" />

      <header className="p-4 border-b border-[#e4b32b]/20 bg-black/90 flex justify-between items-center z-30 shadow-2xl">
        <div className="flex items-center gap-3">
          <BrainCircuit size={18} className={isLoading ? "text-[#e4b32b] animate-pulse" : "text-[#08646e]"} />
          <div>
            <h2 className="text-[10px] tracking-[0.4em] text-white uppercase font-black">MarTwin_Neural_Link</h2>
            <span className="text-[7px] text-[#e4b32b] font-bold tracking-widest uppercase italic">
              {isLoading ? '>> UPLINK_ACTIVE' : '>> SYSTEM_READY'}
            </span>
          </div>
        </div>

        {/* VISOR SUPERIOR DERECHO */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 border border-[#08646e]/30 px-3 py-1.5 bg-[#08646e]/5">
            <Radio size={12} className={isLoading ? "text-red-500 animate-ping" : "text-[#08646e]"} />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">
              Status: <span className={isLoading ? "text-red-500" : "text-[#08646e]"}>{isLoading ? 'EXTRACTING' : 'IDLE'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 border border-[#e4b32b]/20 px-3 py-1.5 bg-[#e4b32b]/5">
            <Cpu size={12} className="text-[#e4b32b]" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">
              Core: <span className="text-[#e4b32b]">V5_STABLE</span>
            </span>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-40">
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 max-w-[85%] border text-[11px] leading-relaxed tracking-tight shadow-2xl ${
              m.role === 'user' 
                ? 'border-[#e4b32b]/30 bg-[#e4b32b]/5 text-zinc-100 border-r-4 border-r-[#e4b32b]' 
                : 'border-[#08646e]/20 bg-zinc-950 text-[#e4b32b] border-l-4 border-l-[#08646e]'
            }`}>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-1">
                <span className="text-[7px] opacity-60 font-black uppercase tracking-widest italic flex items-center gap-2">
                  {m.role === 'user' ? <Zap size={8} className="text-[#e4b32b]" /> : <Activity size={8} className="text-[#08646e]" />}
                  {m.role === 'user' ? 'OPERADOR_MARTIN' : 'MARTWIN_CORE'}
                </span>
              </div>
              
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    const blockId = `block-${m.id || idx}`;

                    return !inline && match ? (
                      <CodeBlock 
                        language={match[1]} 
                        value={codeContent} 
                        onCopy={handleCopy} 
                        copiedId={copiedBlockId} 
                        blockId={blockId} 
                      />
                    ) : (
                      <code className="bg-[#e4b32b]/10 px-1 text-yellow-200" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <footer className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black via-black to-transparent z-40">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className={`flex items-center bg-black border transition-all duration-500 ${isLoading ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-[#e4b32b]/30 focus-within:border-[#e4b32b]'}`}>
            <div className={`p-4 border-r ${isLoading ? 'text-red-500 border-red-900/20 animate-pulse' : 'text-[#e4b32b]/20 border-[#e4b32b]/10'}`}>
              <FileText size={18} />
            </div>
            <input 
              ref={inputRef} 
              autoFocus
              className="flex-1 bg-transparent px-5 py-4 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-800 uppercase italic tracking-wider" 
              value={input} 
              onChange={handleInputChange} 
              placeholder={isLoading ? "EJECUTANDO_RAG..." : "Esperando comando..."} 
              disabled={isLoading} 
            />
            <button 
              type="submit" 
              disabled={isLoading} 
              className={`px-8 py-4 font-black text-[10px] tracking-[0.2em] transition-all ${
                isLoading ? 'bg-red-600 text-white' : 'bg-[#e4b32b] text-black hover:bg-white'
              }`}
            >
              {isLoading ? '...' : 'EXEC'}
            </button>
          </div>
        </form>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4b32b44; }
      `}</style>
    </div>
  );
}