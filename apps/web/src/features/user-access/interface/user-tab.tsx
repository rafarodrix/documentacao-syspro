"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserAccessListItem, UserRoleValue } from "@dosc-syspro/contracts/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Avatar, AvatarFallback, AvatarImage, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator, Badge } from "@dosc-syspro/ui";
import {
  MoreHorizontal,
  Shield,
  Building,
  UserX,
  UserCheck,
  Loader2,
  Users,
  UserPlus,
  Pencil,
  Link2,
} from "lucide-react";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import { ClickableCard, ClickableTableRow, stopRecordClick } from "@/components/platform/shared/clickable-record";
import {
  RegistryEmptyState,
  RegistryFeedback,
  RegistryFilterGroup,
  RegistryPagination,
  RegistryTableCard,
  RegistryToolbar,
} from "@/components/platform/shared/registry-list-scaffold";
import { updateUserStatusAction } from "@/features/user-access/application/user-access-write.actions";

type UserWithRelations = UserAccessListItem;
const USERS_PAGE_SIZE = 50;

export interface UserTabProps {
  data: UserWithRelations[];
  canManage: boolean;
  canViewInternal?: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.substring(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: UserRoleValue }) {
  const isPrivileged = role === "ADMIN" || role === "DEVELOPER" || role === "SUPORTE";
  const labels: Record<UserRoleValue, string> = {
    ADMIN: "Admin",
    DEVELOPER: "Desenvolvedor",
    SUPORTE: "Suporte",
    CLIENTE_ADMIN: "Gestor",
    CLIENTE_USER: "Usuario",
  };

  return (
    <Badge
      variant={isPrivileged ? "info" : "muted"}
      className="gap-1 rounded-full text-[10px] tracking-wider uppercase px-2 py-0.5 border-transparent"
    >
      {isPrivileged && <Shield className="w-2.5 h-2.5" />}
      {labels[role] ?? role}
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant={isActive ? "success" : "muted"}
      className="w-fit gap-1.5 rounded-full text-[10px] px-2.5 py-1"
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 bg-current", isActive ? "animate-pulse" : "opacity-60")} />
      {isActive ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function getUserCompanyChips(user: UserWithRelations) {
  const membershipCompanies = (user.memberships ?? [])
    .map((membership) => ({
      key: `membership:${membership.companyId}`,
      label: membership.company?.nomeFantasia || membership.company?.razaoSocial || "Empresa",
    }))
    .filter((company) => company.label.trim().length > 0);

  if (membershipCompanies.length > 0) {
    return membershipCompanies;
  }

  if (user.contact?.company) {
    return [
      {
        key: `contact:${user.contact.company.id}`,
        label: user.contact.company.nomeFantasia || user.contact.company.razaoSocial,
      },
    ];
  }

  if (user.companyId && user.companyName && user.companyName !== "Sem Vinculo") {
    return [
      {
        key: `fallback:${user.companyId}`,
        label: user.companyName,
      },
    ];
  }

  return [];
}

interface UserActionsProps {
  user: UserWithRelations;
  isLoading: boolean;
  canManage: boolean;
  onToggleStatus: () => void;
}

function UserActions({ user, isLoading, canManage, onToggleStatus }: UserActionsProps) {
  if (!canManage) return null;

  if (isLoading) {
    return (
      <div className="flex justify-end pr-1">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-md transition-all",
            "text-muted-foreground hover:text-foreground",
            "border border-transparent hover:border-border/50 hover:bg-muted",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100",
          )}
          onClick={stopRecordClick}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acoes do usuario</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {user.name || user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
          <Link href={`/portal/cadastros/usuarios/${user.id}/editar`}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">Editar perfil</span>
          </Link>
        </DropdownMenuItem>

        {user.isActive ? (
          // ds-allow: status
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer rounded-md text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={onToggleStatus}
          >
            <UserX className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">Suspender acesso</span>
          </DropdownMenuItem>
        ) : (
          // ds-allow: status
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer rounded-md text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/20"
            onClick={onToggleStatus}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">Ativar acesso</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserTab({ data, canManage, canViewInternal = true }: UserTabProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithRelations[]>(data);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<"all" | "with_company" | "without_company">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "client" | "system">("all");
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<UserWithRelations | null>(null);

  useEffect(() => {
    setUsers(data);
  }, [data]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return users.filter(
      (user) => {
        const companyText = [
          ...user.memberships.map((membership) => `${membership.company?.nomeFantasia || ""} ${membership.company?.razaoSocial || ""}`),
          user.contact?.company?.nomeFantasia || "",
          user.contact?.company?.razaoSocial || "",
          user.companyName || "",
        ]
          .join(" ")
          .toLowerCase();

        return (
          (companyFilter === "all" ||
            (companyFilter === "with_company" && Boolean(user.companyId)) ||
            (companyFilter === "without_company" && !user.companyId)) &&
          (roleFilter === "all" ||
            (roleFilter === "client" && (user.role === "CLIENTE_ADMIN" || user.role === "CLIENTE_USER")) ||
            (roleFilter === "system" && (user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE"))) &&
          (
            !term ||
            user.name?.toLowerCase().includes(term) ||
            user.contact?.name?.toLowerCase().includes(term) ||
            user.contact?.email?.toLowerCase().includes(term) ||
            user.contact?.whatsapp?.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            companyText?.includes(term)
          )
        );
      },
    );
  }, [companyFilter, roleFilter, users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / USERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * USERS_PAGE_SIZE;
    return filteredData.slice(start, start + USERS_PAGE_SIZE);
  }, [currentPage, filteredData]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, companyFilter, roleFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const counts = useMemo(() => {
    const client = users.filter((user) => user.role === "CLIENTE_ADMIN" || user.role === "CLIENTE_USER").length;
    const system = users.filter((user) => user.role === "ADMIN" || user.role === "DEVELOPER" || user.role === "SUPORTE").length;
    const withCompany = users.filter((user) => Boolean(user.companyId)).length;

    return {
      all: users.length,
      active: users.filter((user) => user.isActive).length,
      withoutContact: users.filter((user) => !user.contact).length,
      client,
      system,
      withCompany,
      withoutCompany: users.length - withCompany,
    };
  }, [users]);

  const companyChipsByUser = useMemo(
    () => new Map(users.map((user) => [user.id, getUserCompanyChips(user)])),
    [users],
  );

  const handleToggleStatus = useCallback(async (userId: string, nextActive: boolean) => {
    setLoadingId(userId);
    try {
      const result = await updateUserStatusAction(userId, nextActive);
      if (!result.success) {
        toast.error(result.message);
        setFeedback({ type: "error", message: result.message });
        return;
      }
      toast.success(result.message || "Status alterado.");
      setFeedback({ type: "success", message: result.message || "Status alterado com sucesso." });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)));
    } finally {
      setLoadingId(null);
    }
  }, []);

  const openEdit = useCallback((user: UserWithRelations) => {
    if (!canManage) return;
    router.push(`/portal/cadastros/usuarios/${user.id}/editar`);
  }, [canManage, router]);

  return (
    <>
      <ConfirmActionDialog
        open={!!confirmSuspend}
        onOpenChange={(open) => (!open ? setConfirmSuspend(null) : undefined)}
        title="Confirmar suspensao de acesso"
        description={confirmSuspend ? `Deseja suspender o acesso de ${confirmSuspend.name || confirmSuspend.email}?` : ""}
        confirmLabel="Suspender acesso"
        variant="danger"
        isLoading={!!confirmSuspend && loadingId === confirmSuspend.id}
        onConfirm={async () => {
          if (!confirmSuspend) return;
          await handleToggleStatus(confirmSuspend.id, false);
          setConfirmSuspend(null);
        }}
      />

      <div className="space-y-4">
        {feedback ? <RegistryFeedback type={feedback.type} message={feedback.message} /> : null}

        <RegistryToolbar
          searchValue={searchTerm}
          searchPlaceholder="Nome, e-mail, contato ou empresa..."
          onSearchChange={(value) => setSearchTerm(value)}
          onClearSearch={() => setSearchTerm("")}
          resultLabel={`${filteredData.length} filtrados`}
          filters={
            <>
              <RegistryFilterGroup
                value={roleFilter}
                onChange={(value) => setRoleFilter(value as "all" | "client" | "system")}
                options={[
                  { value: "all", label: "Todos os perfis", count: counts.all },
                  { value: "client", label: "Plataforma", count: counts.client },
                  ...(canViewInternal ? [{ value: "system", label: "Equipe interna", count: counts.system }] : []),
                ]}
              />
              <RegistryFilterGroup
                value={companyFilter}
                onChange={(value) => setCompanyFilter(value as "all" | "with_company" | "without_company")}
                options={[
                  { value: "all", label: "Todas as empresas", count: counts.all },
                  { value: "with_company", label: "Com empresa", count: counts.withCompany },
                  { value: "without_company", label: "Sem empresa", count: counts.withoutCompany },
                ]}
              />
            </>
          }
          actions={
            canManage ? (
              <Button asChild size="sm" className="h-9 gap-2">
                <Link href="/portal/cadastros/usuarios/novo">
                  <UserPlus className="h-4 w-4" />
                  Novo usuario
                </Link>
              </Button>
            ) : null
          }
        />

        <RegistryTableCard>
          <div className="md:hidden divide-y">
            {paginatedData.length === 0 ? (
              <RegistryEmptyState
                icon={Users}
                title="Nenhum usuario cadastrado"
                description="Ajuste os filtros ou cadastre um novo usuario."
                searchTerm={searchTerm}
                onClear={() => setSearchTerm("")}
              />
            ) : (
              paginatedData.map((user) => (
                <ClickableCard
                  key={user.id}
                  enabled={canManage}
                  onOpen={() => openEdit(user)}
                  className="p-4 space-y-3"
                  title="Clique para editar"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-border/40 shadow-sm shrink-0">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <UserActions
                      user={user}
                      isLoading={loadingId === user.id}
                      canManage={canManage}
                      onToggleStatus={() => (user.isActive ? setConfirmSuspend(user) : handleToggleStatus(user.id, true))}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <RoleBadge role={user.role} />
                    <StatusBadge isActive={user.isActive} />
                  </div>
                  <p className="text-xs text-muted-foreground">{user.contact?.name || "Sem contato vinculado"}</p>
                </ClickableCard>
              ))
            )}
          </div>

          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificacao</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato vinculado</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso / Empresa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-right px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <RegistryEmptyState
                      icon={Users}
                      title="Nenhum usuario cadastrado"
                      description="Ajuste os filtros ou cadastre um novo usuario."
                      searchTerm={searchTerm}
                      onClear={() => setSearchTerm("")}
                      compact
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((user, index) => (
                  <ClickableTableRow
                    key={user.id}
                    enabled={canManage}
                    onOpen={() => openEdit(user)}
                    className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                    style={{ animationDelay: `${index * 40}ms` }}
                    title="Clique para editar"
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/40 shadow-sm shrink-0 transition-all group-hover/row:scale-105">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-45">
                            {user.name ?? <span className="italic text-muted-foreground/60 font-normal">Sem nome</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-45">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {user.contact ? (
                          <>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Link2 className="w-3 h-3 shrink-0 opacity-60" />
                              <span className="truncate max-w-40">{user.contact.name}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground/70">
                              {user.contact.whatsapp || user.contact.phone || user.contact.email || "Sem telefone/email"}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic">Sem contato vinculado</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <RoleBadge role={user.role} />
                        {(companyChipsByUser.get(user.id)?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(companyChipsByUser.get(user.id) ?? []).map((company) => (
                              <span
                                key={company.key}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-muted border border-border/40 text-muted-foreground"
                              >
                                <Building className="w-2.5 h-2.5 shrink-0 opacity-60" />
                                <span className="truncate max-w-25">{company.label}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic">Sem vinculos</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge isActive={user.isActive} />
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <UserActions
                        user={user}
                        isLoading={loadingId === user.id}
                        canManage={canManage}
                        onToggleStatus={() => (user.isActive ? setConfirmSuspend(user) : handleToggleStatus(user.id, true))}
                      />
                    </TableCell>
                  </ClickableTableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </RegistryTableCard>

        <div className="flex flex-col gap-2">
          <RegistryPagination
            pagination={{
              page: currentPage,
              pageSize: USERS_PAGE_SIZE,
              total: filteredData.length,
              totalPages,
              hasPreviousPage: currentPage > 1,
              hasNextPage: currentPage < totalPages,
            }}
            itemLabel={{ singular: "usuario", plural: "usuarios" }}
            onPageChange={setPage}
          />
          <div className="px-1 text-xs text-muted-foreground">
            Itens nesta pagina: <span className="font-medium tabular-nums text-foreground">{paginatedData.length}</span>
          </div>
        </div>
      </div>
    </>
  );
}
