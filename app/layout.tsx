// @ts-ignore
import "@/app/globals.css";
import { NextAuthProvider } from "./providers";
import Sidebar from "../src/components/Sidebar"; 

export const metadata = {
  title: "MarTwin - Squad & Zurich Agent",
  description: "Sistema de gestión inteligente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      {/* overflow-hidden en el body evita que toda la página rebote, el scroll lo maneja el main */}
      <body className="bg-black text-white flex h-screen overflow-hidden antialiased font-sans">
        <NextAuthProvider>
          
          <Sidebar /> 
          
          {/* flex-1 hace que tome todo el ancho restante del sidebar */}
          <main className="flex-1 overflow-y-auto bg-[#020202] relative scrollbar-hide">
            
            {/* Gradiente de fondo Zurich: lo moví un poco para que no tape el contenido */}
            <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#08646E]/10 blur-[150px] pointer-events-none z-0" />
            
            {/* Contenedor de contenido: z-10 para estar por encima del gradiente */}
            <div className="relative z-10 min-h-full">
              {children}
            </div>
          </main>

        </NextAuthProvider>
      </body>
    </html>
  );
}