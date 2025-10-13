// Provedor de autenticação NextAuth para a aplicação
'use client';

import { SessionProvider } from "next-auth/react";

type Props = {
  children?: React.ReactNode;
};

export const NextAuthProvider = ({ children }: Props) => {
  return <SessionProvider basePath="/ajuda/api/auth">{children}</SessionProvider>;
};