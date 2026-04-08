"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Mail, Star, Loader2, X, ChevronRight, Inbox } from 'lucide-react';

export default function UnifiedEmailPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  useEffect(() => {
    const fetchEmails = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        setLoading(true);
        // Pedimos los últimos 15 mensajes
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
            const subject = headers.find((h: any) => h.name === "Subject")?.value || "(Sin asunto)";
            const from = headers.find((h: any) => h.name === "From")?.value || "Desconocido";
            const date = new Date(parseInt(msg.internalDate)).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' });
            
            // --- LÓGICA DE EXTRACCIÓN DE HTML ---
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
            
            // Decodificación Base64 URL Safe a UTF-8
            if (rawHtml) {
              htmlContent = decodeURIComponent(
                atob(rawHtml.replace(/-/g, '+').replace(/_/g, '/'))
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
            } else {
              htmlContent = `<p style="color: gray; font-style: italic;">${msg.snippet}</p>`;
            }

            return {
              id: msg.id,
              from: from.split('<')[0],
              email: from.match(/<([^>]+)>/)?.[1] || from,
              subject: subject,
              preview: msg.snippet,
              html: htmlContent, // Aquí guardamos el HTML listo
              time: date,
              isNew: msg.labelIds.includes("UNREAD")
            };
          });

          setEmails(formatted);
        }
      } catch (err) {
        console.error("❌ Error en MarTwin Email:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchEmails();
  }, [session]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-[#08646E]" size={40} />
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-zinc-300 font-mono overflow-hidden">
      
      {/* COLUMNA IZQUIERDA: LISTA */}
      <div className={`flex flex-col transition-all duration-500 border-r border-[#08646E]/10 ${selectedEmail ? 'w-[350px]' : 'w-full'}`}>
        <div className="p-6 border-b border-[#08646E]/10 bg-[#050505]">
          <h1 className="text-sm tracking-[0.4em] text-[#08646E] uppercase italic flex items-center gap-2">
            <Inbox size={14} /> MARTWIN // INBOX
          </h1>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {emails.map((email) => (
            <div 
              key={email.id} 
              onClick={() => setSelectedEmail(email)}
              className={`p-5 border-b border-white/5 transition-all cursor-pointer relative ${
                selectedEmail?.id === email.id 
                ? 'bg-[#08646E]/10' 
                : 'bg-transparent hover:bg-white/5'
              }`}
            >
              {email.isNew && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] truncate max-w-[180px] ${email.isNew ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {email.from}
                </span>
                <span className="text-[8px] text-zinc-600">{email.time}</span>
              </div>
              <h3 className={`text-[11px] mb-1 truncate ${email.isNew ? 'text-zinc-100' : 'text-zinc-500'}`}>{email.subject}</h3>
              <p className="text-[9px] text-zinc-700 truncate italic">{email.preview}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA DERECHA: LECTOR HTML */}
      <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
        {selectedEmail ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-5 duration-300">
            {/* Header del Mail */}
            <div className="p-8 border-b border-white/5 flex justify-between items-start bg-[#020202]">
              <div>
                <h2 className="text-xl text-white mb-2 font-light tracking-tight">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#08646E] uppercase border border-[#08646E]/30 px-2 py-0.5 rounded">De: {selectedEmail.email}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Cuerpo del Mail (HTML Renderizado) */}
            <div className="flex-1 overflow-y-auto p-1 bg-white"> 
              {/* Le puse fondo blanco temporal al div interno para que los mails HTML se lean bien, 
                  podés cambiarlo a bg-transparent si preferís forzar el dark mode */}
              <div 
                className="gmail-html-content p-8"
                dangerouslySetInnerHTML={{ __html: selectedEmail.html }} 
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-900">
            <Mail size={60} className="mb-4 opacity-5" />
            <p className="text-[10px] tracking-[0.8em] uppercase opacity-20 italic">Seleccione comunicación para decodificar</p>
          </div>
        )}
      </div>
      
      {/* Estilos inyectados para el HTML de Gmail */}
      <style jsx global>{`
        .gmail-html-content {
          font-family: sans-serif;
          line-height: 1.5;
          font-size: 14px;
        }
        .gmail-html-content img {
          max-width: 100% !important;
          height: auto !important;
        }
        .gmail-html-content a {
          color: #08646E !important;
          text-decoration: underline;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #08646E33;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}