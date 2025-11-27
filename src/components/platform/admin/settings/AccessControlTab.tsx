"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    getAccessControlAction,
    updateAccessControlAction
} from "@/app/(platform)/admin/_actions/settings-actions";
import {
    SYSTEM_PERMISSIONS,
    ROLE_LABELS,
    AccessControlMatrix,
    PermissionKey
} from "@/core/config/permissions";
import { Role } from "@prisma/client";

export function AccessControlTab() {
    const [matrix, setMatrix] = useState<AccessControlMatrix | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();

    // Carregar dados
    useEffect(() => {
        async function load() {
            const res = await getAccessControlAction();
            if (res.success && res.data) {
                setMatrix(res.data);
            } else {
                toast.error("Erro ao carregar permissões.");
            }
            setIsLoading(false);
        }
        load();
    }, []);

    const handleToggle = (role: Role, permission: PermissionKey) => {
        if (!matrix) return;

        const currentPermissions = matrix[role] || [];
        const hasPermission = currentPermissions.includes(permission);

        let newPermissions;
        if (hasPermission) {
            newPermissions = currentPermissions.filter(p => p !== permission);
        } else {
            newPermissions = [...currentPermissions, permission];
        }

        setMatrix({
            ...matrix,
            [role]: newPermissions
        });
    };

    const handleSave = () => {
        if (!matrix) return;
        startTransition(async () => {
            const res = await updateAccessControlAction(matrix);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        });
    };

    if (isLoading) {
        return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

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
                        <CardTitle>Perfis de Acesso (RBAC)</CardTitle>
                        <CardDescription>Defina o que cada perfil pode visualizar e editar no sistema.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[250px]">Funcionalidade / Permissão</TableHead>
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
                                    </TableCell>
                                    {roles.map(role => {
                                        const isChecked = matrix?.[role]?.includes(permKey as PermissionKey);
                                        const isAdmin = role === 'ADMIN' || role === 'DEVELOPER'; // Opcional: Bloquear remoção de admin

                                        return (
                                            <TableCell key={`${role}-${permKey}`} className="text-center">
                                                <Switch
                                                    checked={isChecked}
                                                    disabled={isAdmin} // Impede tirar acesso de Admin para não quebrar o sistema
                                                    onCheckedChange={() => handleToggle(role, permKey as PermissionKey)}
                                                    className="data-[state=checked]:bg-purple-600"
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end pt-6">
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[150px] shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar Permissões</>}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}