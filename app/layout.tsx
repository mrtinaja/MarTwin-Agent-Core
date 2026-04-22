import './globals.css'
import { Inter } from 'next/font/google'
import Sidebar from '@/components/Sidebar' 
import { NextAuthProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MarTwin Agent Core',
  description: 'Zurich Santander Neural Interface',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white overflow-x-hidden`}>
        <NextAuthProvider>
          <div className="flex min-h-screen">
            <aside className="w-64 flex-shrink-0 border-r border-[#08646E]/20 bg-[#020202] sticky top-0 h-screen">
              <Sidebar />
            </aside>
            <main className="flex-1 bg-[#020202]">
              {children}
            </main>
          </div>
        </NextAuthProvider>
      </body>
    </html>
  )
}