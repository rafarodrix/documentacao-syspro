import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * Este arquivo estende os tipos padrão do NextAuth para incluir
 * propriedades customizadas vindas do provedor Zammad.
 */

declare module "next-auth" {
  /**
   * O objeto User que é retornado pelo callback `profile` do seu provedor.
   * Adicionamos os campos customizados aqui.
   */
  interface User extends DefaultUser {
    // 'id' já é parte do DefaultUser, então não é necessário redeclará-lo.
    roles?: number[];
    organizationId?: number | null;
  }

  /**
   * O objeto Session que é retornado por `useSession` ou `getSession`.
   * Estendemos a propriedade 'user' para refletir nossos campos customizados.
   */
  interface Session extends DefaultSession {
    // MELHORIA: Tornamos o objeto 'user' não opcional dentro da sessão.
    // Em uma sessão autenticada, o usuário sempre existirá.
    // Isso melhora a experiência de desenvolvimento ao evitar checagens desnecessárias.
    user: {
      id: string; // Garantimos que o ID está sempre presente
      roles?: number[];
      organizationId?: number | null;
    } & DefaultSession["user"]; // Unimos com os tipos padrão ('name', 'email', 'image')
  }
}

declare module "next-auth/jwt" {
  /**
   * O token JWT como ele é codificado, antes de se tornar o objeto de sessão.
   * Este tipo deve espelhar os dados que adicionamos no callback `jwt` em `authOptions`.
   */
  interface JWT extends JWT {
    id: string;
    roles?: number[];
    organizationId?: number | null;
  }
}