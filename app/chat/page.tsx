"use client";

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Cpu, Loader2, Plus, Paperclip, X, Send, Copy, Check, Zap, ShieldCheck, BrainCircuit } from 'lucide-react';

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 border border-white/5 hover:border-[#088395]/50 hover:bg-[#088395]/10 transition-all z-10 group"
    >
      {copied ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#FFB000] font-black uppercase tracking-wider">Copied</span>
          <Check size={12} className="text-[#FFB000]" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-zinc-300">
          <span className="text-[9px] uppercase font-black tracking-wider">Copy</span>
          <Copy size={12} />
        </div>
      )}
    </button>
  );
};

export default function ChatPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const { messages, input, setInput, handleInputChange, append, isLoading } = useChat({
    api: '/api/chat',
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;
    const currentInput = input;
    setInput("");
    setAttachedFiles([]);
    await append({ role: 'user', content: currentInput });
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-zinc-300 font-mono overflow-hidden border-l border-white/5 relative">
      {/* Glow ambiental alineado a MarTwin */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(8,131,149,0.1)_0%,_transparent_50%)] pointer-events-none" />

      {/* HEADER */}
      <div className="p-5 border-b border-[#088395]/20 bg-black/60 backdrop-blur-md flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <BrainCircuit size={20} className={isLoading ? "text-[#FFB000] animate-pulse" : "text-[#088395]"} />
            <div className={`absolute inset-0 blur-lg opacity-40 ${isLoading ? 'bg-[#FFB000]' : 'bg-[#088395]'}`}></div>
          </div>
          <div>
            <h2 className="text-[11px] tracking-[0.4em] text-white uppercase font-black italic">MarTwin_Neural_Link</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-[#FFB000] animate-ping' : 'bg-[#088395]'} shadow-[0_0_8px_currentColor]`}></div>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Core_Status: {isLoading ? 'Processing' : 'Standby'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT LOG */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative z-10">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`p-6 max-w-[85%] text-[13px] border relative group transition-all duration-300 ${
              m.role === 'user' 
                ? 'border-[#088395]/30 bg-[#088395]/5 text-zinc-100 rounded-none border-r-4 border-r-[#088395]' 
                : 'border-white/10 bg-zinc-900/40 text-zinc-300 rounded-none border-l-4 border-l-[#FFB000] shadow-2xl backdrop-blur-sm'
            }`}>
              {m.role !== 'user' && <CopyButton text={m.content} />}
              
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <span className={`text-[9px] font-black tracking-[0.2em] uppercase ${m.role === 'user' ? 'text-[#088395] ml-auto' : 'text-[#FFB000]'}`}>
                  {m.role === 'user' ? 'OPERATOR_SYNC' : 'MARTWIN_CORE_OUT'}
                </span>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed tracking-tight select-text">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 text-[#FFB000] text-[10px] font-black uppercase tracking-[0.3em] px-5 py-3 bg-[#FFB000]/5 border border-[#FFB000]/20 italic">
              <Loader2 className="animate-spin" size={14} /> Decrypting_Neural_Signal...
            </div>
          </div>
        )}
      </div>

      {/* INPUT INTERFACE */}
      <div className="p-8 border-t border-[#088395]/20 bg-black/80 backdrop-blur-xl relative z-20">
        <form onSubmit={handleFormSubmit} className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 bg-[#050505] p-2 border border-[#088395]/30 shadow-[0_0_30px_rgba(8,131,149,0.05)] focus-within:border-[#088395] transition-all duration-300">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="p-4 bg-black border border-white/10 hover:border-[#FFB000]/50 hover:text-[#FFB000] transition-all text-zinc-600"
            >
              <Paperclip size={18} />
            </button>
            <input type="file" multiple ref={fileInputRef} className="hidden" />
            
            <input 
              ref={inputRef}
              className="flex-1 bg-transparent px-4 py-4 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-700 tracking-wider"
              value={input}
              onChange={handleInputChange}
              placeholder="Input command sequence..."
            />
            
            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
              className={`h-14 px-10 transition-all duration-300 flex items-center gap-3 font-black uppercase tracking-[0.3em] text-[10px] ${
                !isLoading && (input.trim() || attachedFiles.length > 0) 
                  ? "bg-[#088395] text-white shadow-[0_0_20px_rgba(8,131,149,0.3)] hover:bg-[#0a9eb4]" 
                  : "bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50"
              }`}
            >
              <span>INJECT</span>
              <Zap size={14} fill="currentColor" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}