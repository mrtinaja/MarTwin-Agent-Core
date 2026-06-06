"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Mail, Loader2, X, Terminal, Database, ShieldCheck, Activity, ChevronRight, Fingerprint, Inbox, Search } from 'lucide-react';

const decodeEmailHeader = (text: string) => {
  if (!text) return "";
  try {
    if (text.includes("=?UTF-8?B?") || text.includes("=?utf-8?B?")) {
      return text.replace(/=\?[uU][tT][fF]-8\?[bB]\?([^?]+)\?=/g, (_, base64) => {
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
      });
    }
    return text;
  } catch (e) {
    return text;
  }
};

export default function UnifiedEmailPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchEmails = async () => {
      const token = (session as any)?.accessToken;
      if (!token || !mounted) return;

      try {
        setLoading(true);
        const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const listData = await res.json();

        if (listData.messages) {
          const detailPromises = listData.messages.map(async (msg: any) => {
            const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return detailRes.json();
          });

          const fullMessages = await Promise.all(detailPromises);
          
          const formatted = fullMessages.map((msg: any) => {
            const headers = msg.payload.headers;
            const rawSubject = headers.find((h: any) => h.name === "Subject")?.value || "(SIN ASUNTO)";
            const rawFrom = headers.find((h: any) => h.name === "From")?.value || "Origen Desconocido";
            
            const getHtml = (part: any): string => {
              if (part.mimeType === 'text/html' && part.body.data) return part.body.data;
              if (part.parts) {
                for (let subPart of part.parts) {
                  const found = getHtml(subPart);
                  if (found) return found;
                }
              }
              return "";
            };

            const rawHtml = getHtml(msg.payload);
            let htmlContent = "";

            if (rawHtml) {
              try {
                const base64 = rawHtml.replace(/-/g, '+').replace(/_/g, '/');
                const binString = atob(base64);
                const bytes = new Uint8Array(binString.length);
                for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
                htmlContent = new TextDecoder('utf-8').decode(bytes);
              } catch (e) {
                htmlContent = msg.snippet;
              }
            } else {
              htmlContent = msg.snippet;
            }

            return {
              id: msg.id,
              from: decodeEmailHeader(rawFrom).split('<')[0].trim(),
              email: rawFrom.match(/<([^>]+)>/)?.[1] || rawFrom,
              subject: decodeEmailHeader(rawSubject),
              preview: decodeEmailHeader(msg.snippet),
              html: htmlContent,
              time: new Date(parseInt(msg.internalDate)).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
              fullTime: new Date(parseInt(msg.internalDate)).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              isNew: msg.labelIds.includes("UNREAD")
            };
          });
          setEmails(formatted);
        }
      } catch (err) {
        console.error("❌ ERROR_INBOX:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session && mounted) fetchEmails();
  }, [session, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 text-[#1e1248] font-sans overflow-hidden">
      
      {/* PANEL DE LISTADO */}
      <div className={`flex flex-col transition-all duration-500 bg-white border-r border-gray-100 shadow-sm ${selectedEmail ? 'w-[400px]' : 'w-full md:w-1/2 lg:w-1/3'}`}>
        
        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-[#1e1248] rounded-xl shadow-lg shadow-[#1e1248]/20">
              <Inbox size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-normal tracking-tight uppercase">
                Inbox <span className="text-[#e50051]">Collector</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#e50051] animate-pulse" />
                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Canal Seguro Activo</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Buscar en comunicaciones..." 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#1e1248]/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[#e50051]" />
              <span className="text-[10px] font-normal text-gray-300 uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : (
            emails.map((email) => (
              <div 
                key={email.id} 
                onClick={() => setSelectedEmail(email)}
                className={`p-6 border-b border-gray-50 transition-all cursor-pointer group relative ${
                  selectedEmail?.id === email.id ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/50'
                }`}
              >
                {email.isNew && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e50051]" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-normal uppercase tracking-tight truncate max-w-[180px] ${email.isNew ? 'text-[#1e1248]' : 'text-gray-400'}`}>
                    {email.from}
                  </span>
                  <span className="text-[10px] text-gray-300 font-normal">{email.time}</span>
                </div>
                
                <h3 className={`text-xs mb-1 truncate font-normal ${email.isNew ? 'text-[#1e1248]' : 'text-gray-500 font-normal'}`}>
                  {email.subject}
                </h3>
                <p className="text-[10px] text-gray-400 line-clamp-1 leading-relaxed">
                  {email.preview}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL DE VISTA PREVIA */}
      <div className="flex-1 bg-gray-50 flex flex-col relative">
        {selectedEmail ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            
            <div className="p-10 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-normal bg-[#e50051]/10 text-[#e50051] px-2 py-0.5 rounded uppercase tracking-widest">
                    Comunicación Oficial
                  </span>
                  <span className="text-[10px] text-gray-300 font-normal">{selectedEmail.fullTime}</span>
                </div>
                <h2 className="text-2xl text-[#1e1248] font-normal tracking-tighter uppercase leading-tight mb-4">
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1e1248] flex items-center justify-center text-[10px] text-white font-normal">
                    {selectedEmail.from[0]}
                  </div>
                  <span className="text-xs text-gray-400 font-normal italic">
                    Remitente: <span className="text-[#1e1248] font-normal not-italic">{selectedEmail.email}</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)} 
                className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#e50051] rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 bg-white relative m-8 border border-gray-100 rounded-[2rem] overflow-hidden shadow-2xl">
              <iframe 
                srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #1e1248; background: #fff; }
                  img { max-width: 100%; height: auto; border-radius: 8px; }
                </style></head><body>${selectedEmail.html}</body></html>`}
                className="w-full h-full"
                title="Email Content"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-white rounded-3xl border border-gray-100 flex items-center justify-center text-gray-100 shadow-sm">
              <Mail size={40} />
            </div>
            <p className="text-[11px] font-normal text-gray-300 uppercase tracking-[0.3em]">
              Selecciona una comunicación para inspeccionar
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e124810; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5005120; }
      `}</style>
    </div>
  );
}