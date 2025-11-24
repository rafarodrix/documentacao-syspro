import { getUsersAction } from "../_actions/user-actions";
import { getCompaniesAction } from "../_actions/company-actions"; // Reutilizamos a action de empresas
import { CreateUserSheet } from "@/components/platform/admin/CreateUserSheet";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Shield } from "lucide-react";

export default async function AdminUsuariosPage() {
    // Busca dados em paralelo (Performance)
    const [usersRes, companiesRes] = await Promise.all([
        getUsersAction(),
        getCompaniesAction()
    ]);

    const users = (usersRes.success && usersRes.data) || [];
    const companies = (companiesRes.success && companiesRes.data) || [];

    // Prepara lista simplificada de empresas para o Select do formulário
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
                    <p className="text-muted-foreground">
                        Gerencie acessos e permissões do sistema.
                    </p>
                </div>
                {/* Passamos as empresas para o componente Client-Side */}
                <CreateUserSheet companies={companyOptions} />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Empresa(s)</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name || "Sem nome"}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {user.email}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {user.companies.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {user.companies.map(c => (
                                                <span key={c.razaoSocial} className="text-xs font-medium">
                                                    {c.razaoSocial}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Sem empresa</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                        <Shield className="mr-1 h-3 w-3" />
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? "default" : "secondary"}>
                                        {user.isActive ? "Ativo" : "Inativo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">Editar</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}