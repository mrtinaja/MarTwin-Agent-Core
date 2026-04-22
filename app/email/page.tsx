"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Mail, Loader2, X, Terminal, Database, ShieldCheck, Activity, ChevronRight, Fingerprint } from 'lucide-react';

// PALETA MARTWIN:
// Primario (Cian): #088395
// Secundario (Ámbar): #FFB000
// Fondo: #020202

export default function UnifiedEmailPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-AR', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEmails = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

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
            const subject = headers.find((h: any) => h.name === "Subject")?.value || "(SIN_ASUNTO)";
            const from = headers.find((h: any) => h.name === "From")?.value || "ORIGEN_DESCONOCIDO";
            const date = new Date(parseInt(msg.internalDate)).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            
            let htmlContent = "";
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
            if (rawHtml) {
              htmlContent = atob(rawHtml.replace(/-/g, '+').replace(/_/g, '/'));
            } else {
              htmlContent = msg.snippet;
            }

            return {
              id: msg.id,
              from: from.split('<')[0].trim().toUpperCase(),
              email: from.match(/<([^>]+)>/)?.[1] || from,
              subject: subject.toUpperCase(),
              preview: msg.snippet,
              html: htmlContent,
              time: date,
              isNew: msg.labelIds.includes("UNREAD")
            };
          });
          setEmails(formatted);
        }
      } catch (err) {
        console.error("❌ ERROR_INBOX_DECODE:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchEmails();
  }, [session]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020202]">
      <Loader2 className="animate-spin text-[#088395] mb-4" size={40} />
      <span className="text-[11px] tracking-[0.8em] text-[#088395] animate-pulse uppercase font-black">Decrypting_Inbox...</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020202] text-zinc-400 font-mono overflow-hidden select-none">
      
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,255,0.02),rgba(255,176,0,0.02))] bg-[length:100%_4px,4px_100%] z-50"></div>

      {/* COLUMNA IZQUIERDA: LISTA DE MENSAJES */}
      <div className={`flex flex-col transition-all duration-500 border-r border-[#088395]/20 ${selectedEmail ? 'w-[450px]' : 'w-full'}`}>
        <div className="p-8 border-b border-[#088395]/20 bg-black/40 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-[#088395] shadow-[0_0_8px_#088395] animate-pulse" />
              <span className="text-[10px] tracking-[0.5em] text-[#088395] font-black uppercase">MarTwin_Uplink</span>
            </div>
            <h1 className="text-2xl tracking-tighter text-white font-black uppercase italic">
              INBOX <span className="text-[#FFB000] not-italic drop-shadow-[0_0_10px_rgba(255,176,0,0.3)]">COLLECTOR</span>
            </h1>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar bg-[#020202]">
          {emails.map((email) => (
            <div 
              key={email.id} 
              onClick={() => setSelectedEmail(email)}
              className={`p-6 border-b border-white/5 transition-all cursor-pointer relative group ${
                selectedEmail?.id === email.id 
                ? 'bg-[#088395]/10 border-r-4 border-r-[#FFB000]' 
                : 'bg-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] tracking-widest truncate max-w-[250px] transition-colors font-bold ${
                  email.isNew ? 'text-[#FFB000]' : 'text-zinc-600 group-hover:text-zinc-400'
                }`}>
                  {email.from || "SYSTEM_USER"}
                </span>
                <span className="text-[9px] text-[#088395] font-black">{email.time}</span>
              </div>
              
              <h3 className={`text-[12px] mb-2 truncate uppercase tracking-tighter font-black ${
                email.isNew ? 'text-white' : 'text-zinc-500'
              }`}>
                {email.subject}
              </h3>
              
              <div className="flex items-center gap-2">
                <ChevronRight size={10} className="text-[#088395] group-hover:translate-x-1 transition-transform" />
                <p className="text-[10px] text-zinc-700 truncate italic">
                  {email.preview}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA DERECHA: DECODIFICADOR */}
      <div className="flex-1 bg-[#020202] flex flex-col relative">
        {selectedEmail ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header del Mail */}
            <div className="p-10 border-b border-[#088395]/20 flex justify-between items-start bg-black/60 relative">
              <div className="max-w-[85%]">
                <div className="flex items-center gap-3 mb-4">
                  <Fingerprint size={16} className="text-[#FFB000]" />
                  <span className="text-[10px] text-[#088395] font-black tracking-[0.4em] uppercase">Auth_Signal_Verified</span>
                </div>
                <h2 className="text-3xl text-white mb-6 font-black tracking-tighter leading-none uppercase italic underline decoration-[#FFB000] decoration-2 underline-offset-8">
                  {selectedEmail.subject}
                </h2>
                <div className="flex flex-wrap gap-4">
                  <span className="text-[10px] text-[#088395] border border-[#088395]/30 px-4 py-1.5 bg-[#088395]/5 uppercase font-black italic">
                    SENDER: {selectedEmail.email}
                  </span>
                  <span className="text-[10px] text-zinc-600 border border-white/10 px-4 py-1.5 uppercase font-bold tracking-widest bg-white/5">
                    ID: {selectedEmail.id.slice(0,8)}...
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-4 border border-[#FFB000]/30 text-[#FFB000] hover:bg-[#FFB000] hover:text-black transition-all shadow-[0_0_20px_rgba(255,176,0,0.1)]"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Cuerpo del Mail */}
            <div className="flex-1 bg-white relative group m-8 border border-[#088395]/30">
              <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-[#020202]" />
              <iframe 
                srcDoc={`
                  <html>
                    <head>
                      <style>
                        body { 
                          font-family: 'Inter', sans-serif; 
                          padding: 50px; 
                          color: #000; 
                          line-height: 1.7;
                          background-color: #fff;
                        }
                        img { max-width: 100%; height: auto; }
                        a { color: #088395; font-weight: bold; text-decoration: none; border-bottom: 2px solid #FFB000; }
                        hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
                      </style>
                    </head>
                    <body>${selectedEmail.html}</body>
                  </html>
                `}
                className="w-full h-full grayscale-[0.5] opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                title="MarTwin Decoded Stream"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[#088395]/20">
            <div className="relative mb-8">
              <Mail size={100} className="animate-pulse" />
              <Activity size={40} className="absolute -bottom-4 -right-4 text-[#FFB000]/30" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-[12px] tracking-[1.2em] uppercase font-black">Uplink_Standby</p>
              <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-[#088395]/40 to-transparent" />
              <p className="text-[9px] italic tracking-[0.3em] font-bold">Select encrypted packet to begin sequence</p>
            </div>
          </div>
        )}

        {/* BARRA DE ESTADO INFERIOR */}
        <footer className="h-12 border-t border-[#088395]/20 bg-black flex items-center justify-between px-10 text-[9px] tracking-[0.3em] font-black text-zinc-500 uppercase">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2 text-[#088395]"><Database size={12}/> DB_SYNC: OK</span>
            <span className="flex items-center gap-2 text-[#FFB000]"><ShieldCheck size={12}/> SEC_LAYER: ACTV</span>
            <span className="flex items-center gap-2 animate-pulse"><Activity size={12}/> NEURAL_LINK: ESTABLISHED</span>
          </div>
          <span className="text-white bg-[#088395]/20 px-4 py-1 border border-[#088395]/30">
            [ {time || "00:00:00"} // MARTWIN_CORE ]
          </span>
        </footer>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #088395;
          box-shadow: 0 0 10px #088395;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #020202;
        }
      `}</style>
    </div>
  );
}