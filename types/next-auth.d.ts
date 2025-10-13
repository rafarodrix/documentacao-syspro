import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Aumenta a tipagem do objeto 'User' retornado pela função profile
declare module "next-auth" {
  interface User extends DefaultUser {
    roles?: number[];
    organizationId?: number | null;
  }

  // Aumenta a tipagem do objeto 'session' disponível no lado do cliente
  interface Session {
    user?: {
      roles?: number[];
      organizationId?: number | null;
    } & DefaultSession["user"];
  }
}

// Aumenta a tipagem do objeto 'token' (JWT)
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roles?: number[];
    organizationId?: number | null;
  }
}