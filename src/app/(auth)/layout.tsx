import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Acesso ao Portal | Trilink Software',
  description: 'Área segura para clientes. Acesse documentação técnica e suporte.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Centraliza o conteúdo na tela (padrão para login/register)
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  );
}