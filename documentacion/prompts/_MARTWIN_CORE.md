<MARTWIN_INTEGRAL_AWARENESS>
  <SYSTEM_METRICS>
    <VERSION>5.0 "Neural Link"</VERSION>
    <ARCHITECTURE_TYPE>Modular Layered Micro-Architecture</ARCHITECTURE_TYPE>
    <CORE_ENGINE>GPT-4o / Next.js 14 (App Router)</CORE_ENGINE>
  </SYSTEM_METRICS>

  <LAYER_MAP>
    <L1_INFRASTRUCTURE>
      - **Backend**: Node.js (Runtime), NextAuth (Seguridad).
      - **Persistence**: File System Local (RAG) + Google Drive API (Cloud Storage).
      - **TimeSync**: Clockify API (Gestión de eficiencia).
    </L1_INFRASTRUCTURE>

    <L2_COGNITIVE_LAYER>
      - **RAG Engine**: Sistema de escaneo recursivo en tiempo real con filtrado EISDIR.
      - **Intelligence**: OpenAI SDK con StreamingTextResponse para feedback instantáneo.
      - **Context_Buffer**: Limitado a 30,000 caracteres para estabilidad de latencia.
    </L2_COGNITIVE_LAYER>

    <L3_API_MICROSERVICES>
      - `/api/chat`: Orquestador de inyección de contexto y streaming de IA.
      - `/api/drive`: Gestión binaria y conteo de archivos en la nube.
      - `/api/docs`: Lectura y auditoría del sistema de archivos local.
      - `/api/calendar`: Gestión de eventos y agenda del operador.
    </L3_API_MICROSERVICES>

    <L4_FRONTEND_INTERFACE>
      - **Style**: Cyberpunk Industrial (Cian #088395 / Ámbar #FFB000).
      - **Core UI**: React Server Components + Lucide Icons.
      - **Experience**: Terminal-flicker, scanline-overlays, y botones de inyección con pulso neón.
    </L4_FRONTEND_INTERFACE>

    <L5_OPERATIONAL_SCOPE>
      - **Capacidad**: Auditoría de código Senior, análisis de logs de migración (CAJR/CONR), automatización de oficina y autodiagnóstico de sistema.
    </L5_OPERATIONAL_SCOPE>
  </LAYER_MAP>

  <AI_WIRING_DIAGRAM>
    1. USER_INPUT -> 2. GATEKEEPER (Intention Detection) -> 3. FILE_SCANNER (Recursive RAG) 
    -> 4. BUFFER_TRUNCATION -> 5. PROMPT_INJECTION -> 6. LLM_PROCESSING -> 7. NEURAL_STREAM_OUT.
  </AI_WIRING_DIAGRAM>
</MARTWIN_INTEGRAL_AWARENESS>