"use client";

import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react"; // Usamos ícones em vez de Switch

// Importamos a matriz estática (Fonte da verdade)
import {
    SYSTEM_PERMISSIONS,
    ROLE_LABELS,
    ACCESS_MATRIX, // Matriz estática
    PermissionKey
} from "@/core/config/permissions";
import { Role } from "@prisma/client";

export function AccessControlTab() {
    // Não precisamos de useState ou useEffect, pois os dados são estáticos

    // Listas para iterar
    const roles = Object.keys(ROLE_LABELS) as Role[];
    const permissions = Object.entries(SYSTEM_PERMISSIONS);

    return (
        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/10">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle>Matriz de Permissões (RBAC)</CardTitle>
                        <CardDescription>
                            Visualização das regras de acesso definidas no sistema.
                            <br />
                            <span className="text-xs text-muted-foreground italic">
                                * As permissões são definidas via código por segurança. Contate o desenvolvedor para alterações.
                            </span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[300px]">Funcionalidade / Permissão</TableHead>
                                {roles.map(role => (
                                    <TableHead key={role} className="text-center min-w-[100px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-semibold">{ROLE_LABELS[role]}</span>
                                            <Badge variant="outline" className="text-[10px] font-mono opacity-70">
                                                {role}
                                            </Badge>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissions.map(([permKey, permLabel]) => (
                                <TableRow key={permKey} className="hover:bg-muted/20">
                                    <TableCell className="font-medium text-sm text-muted-foreground">
                                        {permLabel}
                                        <div className="text-[10px] font-mono text-muted-foreground/50">{permKey}</div>
                                    </TableCell>

                                    {roles.map(role => {
                                        // Verifica na matriz estática
                                        const hasPermission = ACCESS_MATRIX[role]?.includes(permKey as PermissionKey);

                                        return (
                                            <TableCell key={`${role}-${permKey}`} className="text-center">
                                                {hasPermission ? (
                                                    <div className="flex justify-center">
                                                        <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center opacity-20">
                                                        <X className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}