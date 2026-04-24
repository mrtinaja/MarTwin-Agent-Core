import NextAuth from "next-auth";
import { authOptions } from "./auth"; // Importamos la configuración limpia

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };