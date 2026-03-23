"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { toggleUserStatusAction } from "@/features/user-access/application/actions";
import type { SystemUserListItem } from "@/features/user-access/domain/model";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  MoreHorizontal,
  ShieldAlert,
  Code2,
  Headset,
  UserX,
  UserCheck,
  Loader2,
  Mail,
  Briefcase,
  Fingerprint,
  X,
  ShieldCheck,
  UserPlus,
  Pencil,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "../shared/ConfirmActionDialog";

type SystemUserWithRelations = SystemUserListItem;

interface SystemUserTabProps {
  data: SystemUserWithRelations[];
  canManage: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; icon: ElementType; className: string }> = {
  DEVELOPER: {
    label: "Developer",
    icon: Code2,
    className: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  SUPORTE: {
    label: "Suporte",
    icon: Headset,
    className: "border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10",
  },
  ADMIN: {
    label: "Super Admin",
    icon: ShieldAlert,
    className: "bg-purple-600 text-white border-transparent shadow-sm shadow-purple-500/20",
  },
};

function formatCPF(cpf: string | null): string {
  if (!cpf) return "-";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.substring(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: Role }) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.SUPORTE;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-[10px] font-bold border w-fit",
        isActive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}

function EmptyState({ isSearching, searchTerm, onClear }: { isSearching: boolean; searchTerm: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-300">
      <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 ring-1 ring-border/40">
        <ShieldCheck className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {isSearching ? `Sem resultados para "${searchTerm}"` : "Nenhum membro administrativo cadastrado"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[260px] text-center">
        {isSearching ? "Tente outros termos ou limpe o filtro." : "Adicione o primeiro membro da equipe interna."}
      </p>
      {isSearching && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" onClick={onClear}>
          <X className="w-3.5 h-3.5" />
          Limpar busca
        </Button>
      )}
    </div>
  );
}

interface SystemActionsProps {
  user: SystemUserWithRelations;
  isLoading: boolean;
  canManage: boolean;
  onToggleStatus: () => void;
}

function SystemActions({ user, isLoading, canManage, onToggleStatus }: SystemActionsProps) {
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
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acoes do membro</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {user.name || user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
          <Link href={`/app/cadastros/sistema/${user.id}/editar`}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">Editar acesso</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2.5 cursor-pointer focus:bg-primary/5 rounded-md">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">Enviar mensagem</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={cn(
            "gap-2.5 cursor-pointer rounded-md",
            user.isActive
              ? "text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/20",
          )}
          onClick={onToggleStatus}
        >
          {user.isActive ? (
            <>
              <UserX className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Suspender acesso</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Reativar acesso</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SystemUserTab({ data, canManage }: SystemUserTabProps) {
  const [users, setUsers] = useState<SystemUserWithRelations[]>(data);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<SystemUserWithRelations | null>(null);

  useEffect(() => {
    setUsers(data);
  }, [data]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const cpfRaw = searchTerm.replace(/\D/g, "");

    return users.filter(
      (user) =>
        !term ||
        user.name?.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.jobTitle?.toLowerCase().includes(term) ||
        (user.cpf && user.cpf.includes(cpfRaw)),
    );
  }, [users, searchTerm]);

  const handleToggleStatus = useCallback(async (userId: string, nextActive: boolean) => {
    setLoadingId(userId);
    try {
      const result = await toggleUserStatusAction(userId, nextActive);
      if (result.success) {
        toast.success(result.message ?? "Status alterado.");
        setFeedback({ type: "success", message: result.message ?? "Status alterado com sucesso." });
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)));
      } else {
        toast.error(result.message ?? "Erro ao alterar status.");
        setFeedback({ type: "error", message: result.message ?? "Erro ao alterar status." });
      }
    } catch {
      toast.error("Erro de conexao com o servidor.");
      setFeedback({ type: "error", message: "Erro de conexao com o servidor." });
    } finally {
      setLoadingId(null);
    }
  }, []);

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
        {feedback && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
            )}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Nome, e-mail, cargo ou CPF..."
              className="pl-9 h-9 bg-background border-border/60 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {canManage && (
            <Link href="/app/cadastros/sistema/novo">
              <Button
                type="button"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md py-2 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground px-4 shadow-sm hover:bg-primary/90 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Novo analista
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                <TableHead className="py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membro da equipe</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cargo / Identificacao</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-right px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState isSearching={!!searchTerm} searchTerm={searchTerm} onClear={() => setSearchTerm("")} />
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-purple-100 dark:border-purple-900/30 flex-shrink-0">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback className="bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[180px]">
                            {user.name ?? <span className="italic text-muted-foreground/60 font-normal">Sem nome</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3 flex-shrink-0 opacity-60" />
                          <span className="truncate max-w-[140px]">{user.jobTitle || <span className="italic opacity-50">Nao informado</span>}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono">
                          <Fingerprint className="w-3 h-3 flex-shrink-0 opacity-50" />
                          {formatCPF(user.cpf)}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge isActive={user.isActive} />
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <SystemActions
                        user={user}
                        isLoading={loadingId === user.id}
                        canManage={canManage}
                        onToggleStatus={() => (user.isActive ? setConfirmSuspend(user) : handleToggleStatus(user.id, true))}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredData.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              Exibindo <span className="font-medium text-foreground tabular-nums">{filteredData.length}</span> de{" "}
              <span className="font-medium text-foreground tabular-nums">{users.length}</span> {users.length === 1 ? "membro" : "membros"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

