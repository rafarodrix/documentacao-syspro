"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Pencil, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import type {
  SettingsPermissionKey,
  SettingsPermissionsAdminView,
  SettingsUserAccessProfileCreateInput,
} from "@dosc-syspro/contracts/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createSettingsUserAccessProfileAction,
  removeSettingsUserAccessProfileAction,
  saveSettingsAccessProfileAction,
  updateSettingsPermissionsMatrixVisibilityAction,
} from "@/features/settings/permissions/application/permissions-actions";

interface AccessControlTabProps {
  adminView: SettingsPermissionsAdminView;
}

const EMPTY_ASSIGNMENT_FORM: SettingsUserAccessProfileCreateInput = {
  userId: "",
  profileId: "",
  scopeType: "GLOBAL",
  reason: "",
};

const EMPTY_PROFILE_FORM = {
  id: undefined as string | undefined,
  key: "",
  label: "",
  description: "",
  permissions: [] as SettingsPermissionKey[],
  isSystem: false,
};

export function AccessControlTab({ adminView }: AccessControlTabProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(adminView.catalog.matrixEnabled);
  const [isPending, startTransition] = useTransition();
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT_FORM);

  const profiles = adminView.profiles;
  const permissions = adminView.catalog.permissions;
  const profileOptions = adminView.profiles.filter((profile) => profile.isActive);
  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
      if (!acc[permission.module]) acc[permission.module] = [];
      acc[permission.module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const handleToggle = (nextValue: boolean) => {
    setEnabled(nextValue);
    startTransition(async () => {
      const result = await updateSettingsPermissionsMatrixVisibilityAction(nextValue);
      if (!result.success) {
        setEnabled(!nextValue);
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Configuracao atualizada.");
      router.refresh();
    });
  };

  const handlePermissionToggle = (permissionKey: SettingsPermissionKey, checked: boolean) => {
    setProfileForm((current) => ({
      ...current,
      permissions: checked
        ? Array.from(new Set([...current.permissions, permissionKey]))
        : current.permissions.filter((item) => item !== permissionKey),
    }));
  };

  const isEditingProfile = Boolean(profileForm.id);

  const resetProfileForm = () => {
    setProfileForm(EMPTY_PROFILE_FORM);
  };

  const handleEditProfile = (profile: SettingsPermissionsAdminView["profiles"][number]) => {
    setProfileForm({
      id: profile.id,
      key: profile.key,
      label: profile.label,
      description: profile.description ?? "",
      permissions: profile.permissions,
      isSystem: profile.isSystem,
    });
  };

  const handleSaveProfile = () => {
    if (!profileForm.key.trim() || !profileForm.label.trim()) {
      toast.error("Informe chave e nome do perfil.");
      return;
    }

    if (profileForm.permissions.length === 0) {
      toast.error("Selecione ao menos uma permissao.");
      return;
    }

    startTransition(async () => {
      const result = await saveSettingsAccessProfileAction({
        id: profileForm.id,
        key: profileForm.key.trim(),
        label: profileForm.label.trim(),
        description: profileForm.description.trim() || undefined,
        permissions: profileForm.permissions,
        isActive: true,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Perfil salvo.");
      resetProfileForm();
      router.refresh();
    });
  };

  const handleAssignProfile = () => {
    if (!assignmentForm.userId || !assignmentForm.profileId) {
      toast.error("Selecione usuario e perfil.");
      return;
    }

    if (assignmentForm.scopeType === "COMPANY" && !assignmentForm.companyId) {
      toast.error("Selecione a empresa para atribuicao por escopo.");
      return;
    }

    startTransition(async () => {
      const result = await createSettingsUserAccessProfileAction({
        ...assignmentForm,
        reason: assignmentForm.reason?.trim() || undefined,
        companyId: assignmentForm.scopeType === "COMPANY" ? assignmentForm.companyId : undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Perfil vinculado.");
      setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
      router.refresh();
    });
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    startTransition(async () => {
      const result = await removeSettingsUserAccessProfileAction(assignmentId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Vinculo removido.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-purple-500/10 bg-purple-500/10 p-2.5 text-purple-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Matriz de Permissoes</CardTitle>
                <CardDescription>
                  Catalogo central dos perfis e permissoes efetivos do sistema.
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
                    {adminView.catalog.profiles.map((profile) => (
                      <TableHead key={profile.key} className="min-w-[120px] text-center">
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

                      {adminView.catalog.profiles.map((profile) => {
                        const allowed = profile.permissions.includes(permission.key);
                        return (
                          <TableCell key={`${profile.key}-${permission.key}`} className="text-center">
                            {allowed ? (
                              <div className="flex justify-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{isEditingProfile ? "Editar Perfil" : "Criar Perfil"}</CardTitle>
                <CardDescription>
                  {isEditingProfile
                    ? "Ajuste nome, descricao e permissoes do perfil selecionado."
                    : "Monte perfis customizados a partir das permissoes do catalogo central."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-key">Chave do perfil</Label>
                <Input
                  id="profile-key"
                  value={profileForm.key}
                  onChange={(event) => setProfileForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="financeiro_leitura"
                  disabled={isPending || profileForm.isSystem}
                />
                {profileForm.isSystem ? (
                  <p className="text-xs text-muted-foreground">
                    Perfis de sistema mantem a chave fixa para preservar o role legado.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-label">Nome</Label>
                <Input
                  id="profile-label"
                  value={profileForm.label}
                  onChange={(event) => setProfileForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Financeiro leitura"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-description">Descricao</Label>
              <Textarea
                id="profile-description"
                value={profileForm.description}
                onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Perfil focado em consulta e acompanhamento."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([moduleKey, modulePermissions]) => (
                <div key={moduleKey} className="rounded-lg border border-border/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{moduleKey.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {modulePermissions.length} permissoes neste modulo
                      </p>
                    </div>
                    <Badge variant="outline">{modulePermissions.length}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {modulePermissions.map((permission) => {
                      const checked = profileForm.permissions.includes(permission.key);
                      return (
                        <label
                          key={permission.key}
                          className="flex items-start gap-3 rounded-md border border-border/40 p-3 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => handlePermissionToggle(permission.key, value === true)}
                            className="mt-0.5"
                          />
                          <span className="space-y-1">
                            <span className="block font-medium">{permission.label}</span>
                            <span className="block text-xs text-muted-foreground">{permission.description}</span>
                            <span className="block font-mono text-[10px] text-muted-foreground/70">{permission.key}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              {isEditingProfile ? (
                <Button variant="ghost" onClick={resetProfileForm} disabled={isPending}>
                  Cancelar
                </Button>
              ) : null}
              <Button onClick={handleSaveProfile} disabled={isPending} className="gap-2">
                <Plus className="h-4 w-4" />
                {isEditingProfile ? "Atualizar perfil" : "Salvar perfil"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Perfis Disponiveis</CardTitle>
            <CardDescription>
              Perfis sincronizados do sistema e perfis customizados persistidos no banco.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="rounded-lg border border-border/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{profile.label}</p>
                      {profile.isSystem ? <Badge variant="secondary">Sistema</Badge> : <Badge variant="outline">Custom</Badge>}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">{profile.key}</p>
                    {profile.description ? (
                      <p className="text-xs text-muted-foreground">{profile.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{profile.permissions.length} permissoes</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleEditProfile(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Vincular Perfil</CardTitle>
                <CardDescription>
                  Atribua um perfil global ou limitado a uma empresa para um usuario.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select
                value={assignmentForm.userId}
                onValueChange={(value) => setAssignmentForm((current) => ({ ...current, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuario" />
                </SelectTrigger>
                <SelectContent>
                  {adminView.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={assignmentForm.profileId}
                onValueChange={(value) => setAssignmentForm((current) => ({ ...current, profileId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profileOptions.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select
                value={assignmentForm.scopeType}
                onValueChange={(value: "GLOBAL" | "COMPANY") =>
                  setAssignmentForm((current) => ({
                    ...current,
                    scopeType: value,
                    companyId: value === "COMPANY" ? current.companyId : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="COMPANY">Por empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentForm.scopeType === "COMPANY" ? (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={assignmentForm.companyId ?? ""}
                  onValueChange={(value) => setAssignmentForm((current) => ({ ...current, companyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminView.companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="assignment-reason">Motivo</Label>
              <Textarea
                id="assignment-reason"
                value={assignmentForm.reason ?? ""}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Opcional. Ex.: suporte apenas para a empresa XPTO."
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAssignProfile} disabled={isPending} className="gap-2">
                <Plus className="h-4 w-4" />
                Vincular perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Vinculos Ativos</CardTitle>
            <CardDescription>
              Visoes efetivas atribuidas diretamente aos usuarios por escopo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminView.assignments.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Nenhum vinculo customizado encontrado. O sistema segue no fallback dos roles legados.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Escopo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-[90px] text-right">Acao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminView.assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{assignment.userName}</div>
                            <div className="text-xs text-muted-foreground">{assignment.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{assignment.profileLabel}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{assignment.profileKey}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={assignment.scopeType === "GLOBAL" ? "secondary" : "outline"}>
                              {assignment.scopeType === "GLOBAL" ? "Global" : "Empresa"}
                            </Badge>
                            {assignment.companyName ? (
                              <div className="text-xs text-muted-foreground">{assignment.companyName}</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {assignment.reason || "Sem motivo informado."}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={isPending}
                            onClick={() => handleRemoveAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
