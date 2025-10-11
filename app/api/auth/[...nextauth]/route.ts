import NextAuth, { type AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  // Provedores OAuth de login  provedor para o Zammad.
  providers: [
    {
      id: "zammad", // Um ID único para este provedor
      name: "Zammad", // Nome que pode aparecer na tela de login
      type: "oauth",  // Tipo de autenticação

      // URL para onde o usuário é redirecionado para fazer login no Zammad
      authorization: {
        url: `${process.env.ZAMMAD_URL}/oauth/authorize`,
        params: { scope: "read" }, // Escopo mínimo necessário
      },

      // URL para onde nosso servidor troca o código de autorização por um token de acesso
      token: `${process.env.ZAMMAD_URL}/oauth/token`,
      
      // URL para buscar as informações do usuário após obter o token
      userinfo: `${process.env.ZAMMAD_URL}/api/v1/users/me`,

      // As credenciais do nosso aplicativo, vindas das variáveis de ambiente
      clientId: process.env.ZAMMAD_CLIENT_ID,
      clientSecret: process.env.ZAMMAD_CLIENT_SECRET,

      // Função para mapear os dados do Zammad para o formato que o NextAuth espera
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email,
          image: profile.image || null, // Se Zammad tiver uma URL de imagem de perfil
        };
      },
    },
  ],
  // Páginas customizadas (opcional, mas recomendado para o seu design)
  pages: {
    signIn: '/login', // Se você quiser criar uma página de login customizada
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };