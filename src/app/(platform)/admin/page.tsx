import { Rocket, Shield } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Shield className="w-7 h-7 text-destructive" /> 
        Área de Administração e Desenvolvimento
      </h1>
      <p className="text-lg text-muted-foreground">
        Acesso restrito. Utilize os links na barra lateral para gestão de usuários,
        deploy e ferramentas de suporte.
      </p>

      {/* Exemplo de Card de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border p-4 rounded-lg bg-card shadow-sm">
          <h3 className="text-xl font-semibold mb-2">34</h3>
          <p className="text-sm text-muted-foreground">Tickets Abertos Hoje</p>
        </div>
        {/* ... outros cards ... */}
      </div>
    </div>
  );
}