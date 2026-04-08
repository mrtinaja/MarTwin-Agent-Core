import React from 'react';

export const AgentDashboard = () => {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar: Proyectos Activos (Zurich, Ivoiviart, etc) */}
      <aside className="w-64 border-r border-slate-800 p-4 hidden md:block">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Proyectos</h2>
        <ul className="space-y-2 text-sm">
          <li className="p-2 bg-blue-900/20 text-blue-400 rounded border border-blue-800/50">Zurich Migration (28/31)</li>
          <li className="p-2 hover:bg-slate-800 rounded cursor-pointer transition">Ivoiviart E-commerce</li>
          <li className="p-2 hover:bg-slate-800 rounded cursor-pointer transition">MuhleSatelital Layouts</li>
        </ul>
      </aside>

      {/* Main: Chat & Intelligence */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center px-6 justify-between">
          <span className="font-semibold text-xl tracking-tight">Martín<span className="text-blue-500">AI</span>_Agent</span>
          <div className="flex gap-2">
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20 flex items-center">● Online</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
            <p className="text-blue-400 font-bold text-xs mb-1 italic">Contexto detectado: Migración Zurich</p>
            <p className="text-sm">Martín, recordá que en el reporte **CAJR** tenemos el timeout intermitente por la query en `TMT_TG_07`. ¿Querés que revisemos la lógica del SP ahora?</p>
          </div>
        </div>

        {/* Input con estilo moderno */}
        <div className="p-6 border-t border-slate-800">
          <div className="max-w-3xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Preguntale a tu agente..." 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition shadow-2xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
};
