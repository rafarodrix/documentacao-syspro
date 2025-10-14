// app/admin/page.tsx
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Painel Interno</h1>
      <p className="text-muted-foreground">Recursos e ferramentas para a equipe de desenvolvimento e suporte.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aqui você começará a adicionar os widgets e ferramentas */}
        <div className="p-6 border rounded-lg">
          <h2 className="font-semibold">Consulta de Códigos</h2>
          <p className="text-sm text-muted-foreground">Busque por códigos de erro ou funcionalidades.</p>
          {/* Futuramente, o componente de busca viria aqui */}
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="font-semibold">Scripts de Banco de Dados</h2>
          <p className="text-sm text-muted-foreground">Repositório de resoluções e scripts úteis.</p>
          {/* Futuramente, o componente de listagem de scripts viria aqui */}
        </div>
      </div>
    </div>
  );
}