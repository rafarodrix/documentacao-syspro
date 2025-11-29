import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Acesso ao Portal | Trilink Software',
  description: 'Área segura para clientes. Acesse documentação técnica, suporte e ferramentas fiscais do Syspro ERP.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // flex-1: Garante que o layout preencha o espaço deixado pelo RootLayout
    // bg-background: Garante a cor base do tema (evita flash branco no dark mode)
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      {children}
    </div>
  );
}