"use client";

// 1. Forzamos modo dinámico
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Mail, Loader2, X, Terminal, Database, ShieldCheck, Activity, ChevronRight, Fingerprint } from 'lucide-react';

// 🟢 FUNCIÓN DE LIMPIEZA PARA ENCABEZADOS
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
  // 🟢 BLINDAJE DE SESIÓN
  const sessionContext = useSession();
  const session = sessionContext?.data || null;

  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);

  // 🟢 EFECTO DE MONTAJE (Aniquila el Error 418)
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-AR', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
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
            const rawSubject = headers.find((h: any) => h.name === "Subject")?.value || "(SIN_ASUNTO)";
            const rawFrom = headers.find((h: any) => h.name === "From")?.value || "ORIGEN_DESCONOCIDO";
            
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
              from: decodeEmailHeader(rawFrom).split('<')[0].trim().toUpperCase(),
              email: rawFrom.match(/<([^>]+)>/)?.[1] || rawFrom,
              subject: decodeEmailHeader(rawSubject).toUpperCase(),
              preview: decodeEmailHeader(msg.snippet),
              html: htmlContent,
              time: new Date(parseInt(msg.internalDate)).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
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

  // 🟢 FILTRO DE SEGURIDAD CRÍTICO: 
  // Si no está montado, devolvemos NULL para que el servidor no mande HTML basura.
  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#020202] text-zinc-400 font-mono overflow-hidden select-none">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,255,0.02),rgba(255,176,0,0.02))] bg-[length:100%_4px,4px_100%] z-50"></div>

      <div className={`flex flex-col transition-all duration-500 border-r border-[#088395]/20 ${selectedEmail ? 'w-[450px]' : 'w-full'}`}>
        <div className="p-8 border-b border-[#088395]/20 bg-black/40">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-[#088395] shadow-[0_0_8px_#088395] animate-pulse" />
            <span className="text-[10px] tracking-[0.5em] text-[#088395] font-black uppercase">MarTwin_Uplink</span>
          </div>
          <h1 className="text-2xl tracking-tighter text-white font-black uppercase italic">
            INBOX <span className="text-[#FFB000] not-italic drop-shadow-[0_0_10px_rgba(255,176,0,0.3)]">COLLECTOR</span>
          </h1>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar bg-[#020202]">
          {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#088395]" /></div>
          ) : (
            emails.map((email) => (
              <div 
                key={email.id} 
                onClick={() => setSelectedEmail(email)}
                className={`p-6 border-b border-white/5 transition-all cursor-pointer group ${
                  selectedEmail?.id === email.id ? 'bg-[#088395]/10 border-r-4 border-r-[#FFB000]' : 'bg-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] tracking-widest truncate max-w-[250px] font-bold ${email.isNew ? 'text-[#FFB000]' : 'text-zinc-600'}`}>{email.from}</span>
                  <span className="text-[9px] text-[#088395] font-black">{email.time}</span>
                </div>
                <h3 className={`text-[12px] mb-2 truncate uppercase tracking-tighter font-black ${email.isNew ? 'text-white' : 'text-zinc-500'}`}>{email.subject}</h3>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 bg-[#020202] flex flex-col relative">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            <div className="p-10 border-b border-[#088395]/20 flex justify-between items-start bg-black/60">
              <div className="max-w-[85%]">
                <h2 className="text-3xl text-white mb-6 font-black tracking-tighter uppercase italic">{selectedEmail.subject}</h2>
                <span className="text-[10px] text-[#088395] border border-[#088395]/30 px-4 py-1.5 bg-[#088395]/5 uppercase font-black italic">SENDER: {selectedEmail.email}</span>
              </div>
              <button onClick={() => setSelectedEmail(null)} className="p-4 text-[#FFB000] hover:bg-[#FFB000] hover:text-black transition-all"><X size={24} /></button>
            </div>
            
            <div className="flex-1 bg-white relative m-8 border border-[#088395]/30 overflow-hidden">
              <iframe 
                srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:30px;line-height:1.6;}</style></head><body>${selectedEmail.html}</body></html>`}
                className="w-full h-full"
                title="Email Content"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-zinc-600">Selecciona un correo</span>
          </div>
        )}
      </div>
    </div>
  );
}