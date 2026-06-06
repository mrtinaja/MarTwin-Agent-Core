// app/layout.tsx
import "./globals.css";
import { Providers } from "./providers"; // 🟢 Importación nombrada correcta
import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('martwin-theme');
                document.documentElement.classList.toggle('dark', localStorage.getItem('pagotic-theme') === 'dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
