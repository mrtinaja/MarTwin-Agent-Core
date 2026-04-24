// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

// 🟢 Exportación NOMBRADA (con export antes de la function)
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}