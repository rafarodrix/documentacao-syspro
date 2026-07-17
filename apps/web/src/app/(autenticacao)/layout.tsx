import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Acesso ao Portal | Trilink Software',
  description: 'Área segura para clientes.',
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
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
