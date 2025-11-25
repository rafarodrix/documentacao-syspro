import { getUsersAction } from "../_actions/user-actions";
import { getCompaniesAction } from "../_actions/company-actions";
import { UserSheet } from "@/components/platform/admin/UserSheet";
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
import { Mail, Shield, Search, User as UserIcon, Building2, Users } from "lucide-react";

export default async function AdminUsuariosPage() {
    // Busca dados em paralelo
    const [usersRes, companiesRes] = await Promise.all([
        getUsersAction(),
        getCompaniesAction()
    ]);

    // Garante arrays vazios em caso de falha
    const users = (usersRes.success && usersRes.data) || [];
    const companies = (companiesRes.success && companiesRes.data) || [];

    // Prepara as opções para o Select no Sheet
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Cabeçalho e Ações */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Usuários
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Gerencie acessos, permissões e vínculos empresariais.
                    </p>
                </div>
                <UserSheet companies={companyOptions} />
            </div>

            {/* Barra de Ferramentas */}
            <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nome ou e-mail..."
                        className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden md:inline">Total de usuários:</span>
                    <Badge variant="secondary" className="font-mono text-primary bg-primary/10 border-primary/20">
                        {users.length}
                    </Badge>
                </div>
            </div>

            {/* Tabela Estilizada */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[300px]">Usuário</TableHead>
                                <TableHead>Empresa(s)</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-[400px] text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
                                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center border border-dashed border-muted-foreground/30">
                                                <Users className="h-8 w-8 opacity-30" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-medium text-foreground">Nenhum usuário encontrado</p>
                                                <p className="text-sm text-muted-foreground">Convide um novo membro para começar.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {/* Avatar Placeholder */}
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm">
                                                    <span className="font-semibold text-sm">
                                                        {user.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                        {user.name || "Sem nome"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3 opacity-70" /> {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.companies.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.companies.map(c => (
                                                        <div
                                                            key={c.id}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-medium text-muted-foreground hover:bg-background hover:border-primary/30 transition-colors"
                                                        >
                                                            <Building2 className="h-3 w-3 opacity-50" />
                                                            {c.razaoSocial}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/50 italic pl-2">Sem vínculo</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <RoleBadge role={user.role} />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge isActive={user.isActive} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <UserSheet
                                                companies={companyOptions}
                                                userToEdit={{
                                                    id: user.id,
                                                    name: user.name,
                                                    email: user.email,
                                                    role: user.role,
                                                    companies: user.companies.map(c => ({ id: c.id }))
                                                }}
                                            />
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

/* --- Componentes Visuais Auxiliares --- */

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        'ADMIN': 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900 dark:text-purple-400',
        'DEVELOPER': 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900 dark:text-indigo-400',
        'SUPORTE': 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900 dark:text-orange-400',
        'CLIENT': 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400',
    };

    return (
        <Badge variant="outline" className={`font-normal border shadow-none ${styles[role] || styles['CLIENT']}`}>
            <Shield className="mr-1 h-3 w-3 opacity-70" />
            {role}
        </Badge>
    );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <Badge
            variant="outline"
            className={`font-normal border px-2.5 py-0.5 ${isActive
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900 dark:text-red-400'
                }`}
        >
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isActive ? 'Ativo' : 'Inativo'}
        </Badge>
    );
}