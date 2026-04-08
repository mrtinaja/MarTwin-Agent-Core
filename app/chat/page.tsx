"use client";

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { Terminal, Cpu, Database, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [docsContext, setDocsContext] = useState("");
  const [isMemoryReady, setIsMemoryReady] = useState(false);

  useEffect(() => {
    async function syncSystem() {
      try {
        const resDocs = await fetch('/api/docs/read');
        const contentType = resDocs.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          const data = await resDocs.json();
          setDocsContext(data.context || "");
        }
      } catch (err) {
        console.error("Error sync:", err);
      } finally {
        setIsMemoryReady(true);
      }
    }
    syncSystem();
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { dataContext: docsContext }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-300 font-mono overflow-hidden">
      <div className="p-6 border-b border-[#08646E]/20 bg-zinc-950/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Cpu size={16} className={isMemoryReady ? "text-[#08646E]" : "animate-pulse"} />
          <h2 className="text-[10px] tracking-widest text-[#08646E] uppercase italic">MarTwin Core</h2>
        </div>
        <p className="text-[7px] text-zinc-600 uppercase italic">
          {isMemoryReady ? "MEMORIA_OK" : "SINCRONIZANDO..."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 max-w-2xl text-[11px] border ${m.role === 'user' ? 'border-[#08646E]/30 bg-[#08646E]/5' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-8 border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex gap-4 max-w-6xl mx-auto relative">
          {!isMemoryReady && <div className="absolute inset-0 bg-black/90 z-20 flex items-center justify-center text-[9px]">Sincronizando...</div>}
          <input
            className="flex-1 bg-[#050c0e] border border-white/5 rounded-xl px-6 py-4 text-[11px] outline-none focus:border-[#08646E]/50"
            value={input}
            placeholder="Consultar memoria..."
            onChange={handleInputChange}
          />
          <button type="submit" disabled={!isMemoryReady} className="bg-[#08646E] px-10 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all">EJECUTAR</button>
        </form>
      </div>
    </div>
  );
}