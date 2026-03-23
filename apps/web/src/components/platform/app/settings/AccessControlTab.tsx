"use client";

import { useState, useTransition } from "react";
import { Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateRbacMatrixVisibilityAction } from "@/features/settings/application/actions";
import {
    SYSTEM_PERMISSIONS,
    ROLE_LABELS,
    ACCESS_MATRIX,
    PermissionKey,
} from "@/features/user-access/domain/permissions";
import { Role } from "@prisma/client";

interface AccessControlTabProps {
    initialEnabled: boolean;
}

export function AccessControlTab({ initialEnabled }: AccessControlTabProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();

    const roles = Object.keys(ROLE_LABELS) as Role[];
    const permissions = Object.entries(SYSTEM_PERMISSIONS);

    const handleToggle = (nextValue: boolean) => {
        setEnabled(nextValue);
        startTransition(async () => {
            const result = await updateRbacMatrixVisibilityAction(nextValue);
            if (!result.success) {
                setEnabled(!nextValue);
                toast.error(result.error);
                return;
            }
            toast.success(result.message ?? "Configuracao atualizada.");
        });
    };

    return (
        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/10">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>Matriz de Permissoes (RBAC)</CardTitle>
                            <CardDescription>
                                Visualizacao das regras de acesso definidas no sistema.
                                <br />
                                <span className="text-xs text-muted-foreground italic">
                                    * As permissoes sao definidas via codigo por seguranca. Contate o desenvolvedor para alteracoes.
                                </span>
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                        <Label htmlFor="rbac-matrix-toggle" className="text-xs text-muted-foreground">
                            Matriz visivel
                        </Label>
                        <Switch
                            id="rbac-matrix-toggle"
                            checked={enabled}
                            disabled={isPending}
                            onCheckedChange={handleToggle}
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {!enabled ? (
                    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        Matriz RBAC desativada. Ative a chave para exibir a tabela de permissoes.
                    </div>
                ) : (
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[300px]">Funcionalidade / Permissao</TableHead>
                                    {roles.map((role) => (
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

                                        {roles.map((role) => {
                                            const allowed = ACCESS_MATRIX[role]?.includes(permKey as PermissionKey);
                                            return (
                                                <TableCell key={`${role}-${permKey}`} className="text-center">
                                                    {allowed ? (
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
                )}
            </CardContent>
        </Card>
    );
}


