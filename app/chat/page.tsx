"use client";
export const dynamic = "force-dynamic";

import { useChat } from 'ai/react';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  BrainCircuit, Activity, Terminal, Copy, Check, Cpu, SendHorizontal, Bot, User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value, onCopy, copiedId, blockId }: any) => {
  return (
    <div className="relative my-6 rounded-2xl overflow-hidden bg-[#1e1248] shadow-xl group border border-gray-800">
      <div className="bg-[#1e1248] px-4 py-2 border-b border-white/10 text-[10px] text-gray-400 font-normal uppercase flex justify-between items-center">
        <span className="flex items-center gap-2">
          <Terminal size={12} className="text-[#e50051]" /> {language || 'code'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(value, blockId);
          }}
          className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg border border-white/10 active:scale-95"
        >
          {copiedId === blockId ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copiedId === blockId ? 'COPIADO' : 'COPIAR'}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, background: 'transparent', padding: '1.5rem', fontSize: '12px', lineHeight: '1.6' }}
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
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [{
      id: 'init',
      role: 'assistant',
      content: 'Hola, soy el asistente tecnico de **Pago TIC**. Puedo ayudarte con desarrollo, analisis de codigo, documentacion, QA, debugging, arquitectura y automatizacion.'
    }],
  });

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

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

  if (!mounted) return <div className="h-screen bg-gray-50" />;

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-[#1e1248] font-sans overflow-hidden relative">
      <header className="p-6 bg-white border-b border-gray-100 flex justify-between items-center z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1e1248] rounded-2xl shadow-lg shadow-[#1e1248]/20">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-normal tracking-tight text-[#1e1248] uppercase">Pago TIC <span className="text-[#e50051]">AI Assistant</span></h2>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isLoading ? "bg-[#e50051] animate-pulse" : "bg-green-500"}`} />
              <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">
                {isLoading ? 'IA procesando...' : 'Sistema en linea'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl">
          <Cpu size={14} className="text-[#1e1248]" />
          <span className="text-[10px] font-normal text-[#1e1248]/60 uppercase tracking-tighter">Model: <span className="text-[#e50051]">v6-Turbo</span></span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar pb-40">
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
            <div className={`flex gap-4 max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border ${
                m.role === 'user' ? 'bg-white border-gray-100 text-[#1e1248]' : 'bg-[#1e1248] border-[#1e1248] text-white'
              }`}>
                {m.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-[#e50051]" />}
              </div>

              <div className={`p-6 rounded-[2rem] text-[14px] leading-relaxed shadow-sm border ${
                m.role === 'user'
                  ? 'bg-white border-gray-100 rounded-tr-none text-[#1e1248]'
                  : 'bg-[#1e1248] border-[#1e1248] rounded-tl-none text-gray-100'
              }`}>
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit prose-strong:font-normal">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeContent = String(children).replace(/\n$/, '');
                        const blockId = `block-${m.id || idx}`;
                        const isInline = !match;

                        if (!isInline) {
                          return (
                            <CodeBlock
                              language={match[1]}
                              value={codeContent}
                              onCopy={handleCopy}
                              copiedId={copiedBlockId}
                              blockId={blockId}
                            />
                          );
                        }

                        return (
                          <code
                            className="bg-[#e50051]/10 px-1.5 py-0.5 rounded text-[#e50051] font-normal"
                            {...props}
                          >
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
            </div>
          </div>
        ))}
      </div>

      <footer className="absolute bottom-0 w-full p-8 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-40">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className={`flex items-center bg-white rounded-[2.5rem] border p-2 transition-all duration-300 shadow-xl ${
            isLoading ? 'border-[#e50051] ring-4 ring-[#e50051]/5' : 'border-gray-100 focus-within:border-[#1e1248] focus-within:ring-4 focus-within:ring-[#1e1248]/5'
          }`}>
            <div className="p-4 text-gray-300">
              <Activity size={20} className={isLoading ? "text-[#e50051] animate-pulse" : ""} />
            </div>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent px-2 py-4 text-sm text-[#1e1248] outline-none placeholder:text-gray-400 font-normal"
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "IA analizando requerimiento..." : "Escribe tu consulta aqui..."}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`flex items-center gap-2 px-8 py-4 rounded-[2rem] font-normal text-xs uppercase tracking-widest transition-all ${
                isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#1e1248] text-white hover:bg-[#e50051] shadow-lg shadow-[#1e1248]/20 hover:shadow-[#e50051]/20 active:scale-95'
              }`}
            >
              {isLoading ? '...' : <><SendHorizontal size={16} /> Enviar</>}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 font-normal uppercase tracking-[0.2em]">
            Pago TIC IT Development Core // Secure Workspace
          </p>
        </form>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e124822; border-radius: 10px; }
        .prose strong { color: inherit; font-weight: 400; }
        .prose code { color: #e50051; }
      `}</style>
    </div>
  );
}
