import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string; // Esto permite que session.accessToken exista
    user: {
      name?: string;
      email?: string;
      image?: string;
    };
  }
}