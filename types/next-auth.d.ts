import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Extensões para incluir roles e organizationId no usuário, sessão e token JWT
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string; 
    roles?: number[];
    organizationId?: number | null;
  }
  
  interface Session {
    user?: {
      id: string; 
      roles?: number[];
      organizationId?: number | null;
    } & DefaultSession["user"];
  }
}

// Extensões para incluir roles e organizationId no token JWT
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string; 
    roles?: number[];
    organizationId?: number | null;
  }
}
