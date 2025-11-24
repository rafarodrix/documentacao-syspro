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
import { Users } from "lucide-react";

export default async function AdminEmpresasPage() {
  const result = await getCompaniesAction();
  const companies = (result.success && result.data) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes e organizações cadastradas no sistema.
          </p>
        </div>
        <CompanySheet />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              /* O TypeScript agora deve inferir 'company' corretamente 
                 porque garantimos que 'companies' é um array vindo do Prisma.
              */
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{company.razaoSocial}</span>
                      <span className="text-xs text-muted-foreground">
                        {company.nomeFantasia || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{company._count.users}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Botão de Editar */}
                    <CompanySheet companyToEdit={company} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}