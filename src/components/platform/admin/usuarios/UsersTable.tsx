"use client";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserSheet } from "@/components/platform/admin/usuarios/UserSheet";
import { Mail, Building2, Shield, ShieldAlert, Code } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsersTableProps {
    users: any[];
    companyOptions: { id: string; razaoSocial: string }[];
}

export function UsersTable({ users, companyOptions }: UsersTableProps) {
    return (
        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="w-[300px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 h-12">Usuário</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Vínculos</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Função</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                        <p className="font-medium text-foreground">Nenhum usuário encontrado</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user, index) => (
                                <TableRow
                                    key={user.id}
                                    className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Usuário Info */}
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border">
                                                <AvatarImage src={user.image || ""} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                    {user.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                                                    {user.name || "Sem nome"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3 opacity-70" /> {user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Empresas */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                            {user.companies.length > 0 ? (
                                                user.companies.map((c: any) => (
                                                    <div key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 text-[10px] font-medium text-muted-foreground hover:bg-background hover:border-primary/20 transition-colors cursor-default">
                                                        <Building2 className="h-3 w-3 opacity-50" />
                                                        <span className="truncate max-w-[120px]">{c.razaoSocial}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40 italic px-2">Sem vínculos</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Role */}
                                    <TableCell>
                                        <RoleBadge role={user.role} />
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors",
                                            user.isActive
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                        )}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full", user.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                            {user.isActive ? "Ativo" : "Inativo"}
                                        </div>
                                    </TableCell>

                                    {/* Ações */}
                                    <TableCell className="text-right">
                                        <UserSheet
                                            companies={companyOptions}
                                            userToEdit={{
                                                id: user.id,
                                                name: user.name,
                                                email: user.email,
                                                role: user.role,
                                                companies: user.companies.map((c: any) => ({ id: c.id }))
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
    );
}

// --- HELPERS VISUAIS ---
function RoleBadge({ role }: { role: string }) {
    const config: Record<string, { color: string, icon: React.ElementType, label: string }> = {
        'ADMIN': { color: "text-purple-600 bg-purple-500/10 border-purple-200", icon: ShieldAlert, label: "Admin" },
        'DEVELOPER': { color: "text-indigo-600 bg-indigo-500/10 border-indigo-200", icon: Code, label: "Dev" },
        'SUPORTE': { color: "text-orange-600 bg-orange-500/10 border-orange-200", icon: Shield, label: "Suporte" },
        'CLIENTE_USER': { color: "text-slate-600 bg-slate-100 border-slate-200", icon: Shield, label: "Cliente" },
    };

    const style = config[role] || config['CLIENTE_USER'];
    const Icon = style.icon;

    return (
        <Badge variant="outline" className={cn("font-medium border px-2 py-0.5 text-[10px] gap-1", style.color)}>
            <Icon className="h-3 w-3" /> {style.label}
        </Badge>
    );
}