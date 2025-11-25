import { getCompaniesAction } from "../_actions/company-actions";
import { CompanySheet } from "@/components/platform/admin/CompanySheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Users, Building2, Search, FileText } from "lucide-react";

export default async function AdminEmpresasPage() {
  const result = await getCompaniesAction();
  const companies = (result.success && result.data) ? result.data : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Cabeçalho e Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Empresas
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie as organizações e clientes cadastrados.
          </p>
        </div>
        <CompanySheet />
      </div>

      {/* Barra de Ferramentas (Filtros e Busca) */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtrar por nome ou CNPJ..."
            className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden md:inline">Total de registros:</span>
          <Badge variant="secondary" className="font-mono text-primary bg-primary/10 border-primary/20">
            {companies.length}
          </Badge>
        </div>
      </div>

      {/* Tabela Estilizada */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Organização</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center border border-dashed border-muted-foreground/30">
                        <Building2 className="h-8 w-8 opacity-30" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground">Nenhuma empresa encontrada</p>
                        <p className="text-sm text-muted-foreground">Cadastre uma nova organização para começar.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm group-hover:scale-105 transition-transform">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {company.razaoSocial}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {company.nomeFantasia || company.razaoSocial}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit border border-transparent group-hover:border-border/50 transition-colors">
                        <FileText className="h-3 w-3 opacity-50" />
                        {company.cnpj}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex -space-x-2">
                          {/* Mock visual de avatares empilhados se houver usuários, ou ícone simples */}
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                            <Users className="h-3 w-3" />
                          </div>
                        </div>
                        <span>{company._count?.users || 0} ativos</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <CompanySheet companyToEdit={company} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* --- Componente Auxiliar para Status --- */
function StatusBadge({ status }: { status: string }) {
  const isInfo = status === 'ACTIVE' || status === 'ATIVO';

  return (
    <Badge
      variant="outline"
      className={`font-normal border px-2.5 py-0.5 ${isInfo
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900 dark:text-emerald-400'
          : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
        }`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isInfo ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
      {status === 'ACTIVE' ? 'Ativo' : status}
    </Badge>
  );
}