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
import type { SettingsPermissionsCatalog } from "@dosc-syspro/contracts";

interface AccessControlTabProps {
    initialCatalog: SettingsPermissionsCatalog;
}

export function AccessControlTab({ initialCatalog }: AccessControlTabProps) {
    const [enabled, setEnabled] = useState(initialCatalog.matrixEnabled);
    const [isPending, startTransition] = useTransition();
    const profiles = initialCatalog.profiles;
    const permissions = initialCatalog.permissions;

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
                                    {profiles.map((profile) => (
                                        <TableHead key={profile.key} className="text-center min-w-[100px]">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-semibold">{profile.label}</span>
                                                <Badge variant="outline" className="text-[10px] font-mono opacity-70">
                                                    {profile.key}
                                                </Badge>
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.map((permission) => (
                                    <TableRow key={permission.key} className="hover:bg-muted/20">
                                        <TableCell className="font-medium text-sm text-muted-foreground">
                                            {permission.label}
                                            <div className="text-[10px] font-mono text-muted-foreground/50">{permission.key}</div>
                                        </TableCell>

                                        {profiles.map((profile) => {
                                            const allowed = profile.permissions.includes(permission.key);
                                            return (
                                                <TableCell key={`${profile.key}-${permission.key}`} className="text-center">
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


