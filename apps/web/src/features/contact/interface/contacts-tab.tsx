"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ContactListItem, type ContactStats as ContactStatsContract } from "@dosc-syspro/contracts/contact";
import { trpc } from "@/lib/api/trpc-client";
import {
  Building2,
  Briefcase,
  CheckCircle2,
  Edit3,
  Fingerprint,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@dosc-syspro/ui";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import { ClickableCard, ClickableTableRow, stopRecordClick } from "@/components/platform/shared/clickable-record";
import {
  RegistryEmptyState,
  RegistryFilterGroup,
  RegistryPagination,
  RegistryTableCard,
  RegistryToolbar,
  type RegistryPaginationState,
} from "@/components/platform/shared/registry-list-scaffold";
import { cn } from "@/lib/utils";
import { deleteContactAction, syncContactsAction, unlinkContactCompaniesAction } from "@/features/contact/application/contact-write.actions";

type ContactItem = ContactListItem;

type ScopeFilter = "all" | "linked" | "unlinked";

type ContactStats = ContactStatsContract;

interface ContactsTabProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSync: boolean;
}

const SCOPE_LABELS: Record<ScopeFilter, string> = {
  all: "Todos",
  linked: "Vinculados",
  unlinked: "Sem empresa",
};

const CONTACTS_PAGE_SIZE = 50;

function getCompanyNames(contact: ContactItem) {
  if (contact.companies?.length) {
    return contact.companies.map((company) => company.nomeFantasia || company.razaoSocial).join(", ");
  }

  if (contact.company) {
    return contact.company.nomeFantasia || contact.company.razaoSocial;
  }

  return "";
}

function getLinkedCount(contact: ContactItem) {
  return contact.companyIds?.length ?? contact.companies?.length ?? (contact.company ? 1 : 0);
}

function getPrimaryPhone(contact: ContactItem) {
  return contact.whatsapp || contact.phone || null;
}

function formatCpf(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return value || null;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function ContactsTab({ canCreate, canEdit, canDelete, canSync }: ContactsTabProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactStats, setContactStats] = useState<ContactStats | null>(null);
  const [pagination, setPagination] = useState<RegistryPaginationState>({
    page: 1,
    pageSize: CONTACTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: "delete" | "unlink"; contact: ContactItem } | null>(null);

  const loadContactStats = async () => {
    const data = await trpc.contacts.getStats.query();
    setContactStats(data);
  };

  const loadContacts = async () => {
    setLoadingList(true);

    try {
      const data = await trpc.contacts.list.query({
        unlinked: scope === "unlinked" ? "true" : scope === "linked" ? "false" : undefined,
        q: searchTerm.trim() || undefined,
        page: String(page),
        pageSize: String(CONTACTS_PAGE_SIZE),
      });

      const items = data.items;
      const nextPagination = data.pagination;
      const normalizedPagination: RegistryPaginationState = {
        page: nextPagination.page,
        pageSize: nextPagination.pageSize,
        total: nextPagination.total,
        totalPages: Math.max(1, Math.ceil(nextPagination.total / nextPagination.pageSize)),
        hasPreviousPage: nextPagination.hasPreviousPage,
        hasNextPage: nextPagination.hasNextPage,
      };

      setContacts(items);
      setPagination(normalizedPagination);
      if (items.length === 0 && normalizedPagination.page > 1 && normalizedPagination.total > 0) {
        setPage(normalizedPagination.totalPages ?? 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar contatos";
      toast.error(message);
      setContacts([]);
    } finally {
      setLoadingList(false);
    }
  };

  const refreshContactsView = async () => {
    try {
      await Promise.all([loadContacts(), loadContactStats()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar contatos";
      toast.error(message);
    }
  };

  useEffect(() => {
    void refreshContactsView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, page, searchTerm]);

  const filteredData = useMemo(() => {
    return contacts
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base", numeric: true }));
  }, [contacts]);

  const counts = useMemo(() => {
    const linked = contacts.filter((contact) => getLinkedCount(contact) > 0).length;
    const withEmail = contacts.filter((contact) => Boolean(contact.email)).length;
    const withPhone = contacts.filter((contact) => Boolean(getPrimaryPhone(contact))).length;

    const localCounts = {
      all: contacts.length,
      linked,
      unlinked: contacts.length - linked,
      withEmail,
      withPhone,
    };

    return contactStats ?? localCounts;
  }, [contactStats, contacts]);

  const handleScopeChange = (nextScope: ScopeFilter) => {
    setPage(1);
    setScope(nextScope);
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearchTerm(value);
  };

  const openEdit = (contact: ContactItem) => {
    if (!canEdit) return;
    router.push(`/portal/contatos/${contact.id}/editar`);
  };

  const handleUnlink = async (contact: ContactItem) => {
    setLoadingId(contact.id);

    try {
      const result = await unlinkContactCompaniesAction(contact.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message || "Empresas desvinculadas com sucesso.");
      await refreshContactsView();
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (contact: ContactItem) => {
    setLoadingId(contact.id);

    try {
      const result = await deleteContactAction(contact.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message || "Contato removido da lista com sucesso.");
      await refreshContactsView();
    } finally {
      setLoadingId(null);
    }
  };

  const handleEvolutionSync = async () => {
    setSyncing(true);

    try {
      const result = await syncContactsAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message || "Sincronizacao concluida.");
      await refreshContactsView();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <ConfirmActionDialog
        open={!!confirmDialog}
        onOpenChange={(open) => (!open ? setConfirmDialog(null) : undefined)}
        title={confirmDialog?.type === "delete" ? "Confirmar arquivamento do contato" : "Confirmar desvinculacao"}
        description={
          confirmDialog
            ? confirmDialog.type === "delete"
              ? `Deseja arquivar o contato "${confirmDialog.contact.name}"? Ele sai das listas, mas o historico permanece preservado. Contatos invalidos de ligacao serao removidos definitivamente.`
              : `Deseja desvincular todas as empresas do contato "${confirmDialog.contact.name}"?`
            : ""
        }
        confirmLabel={confirmDialog?.type === "delete" ? "Arquivar contato" : "Confirmar"}
        isLoading={!!confirmDialog?.contact && loadingId === confirmDialog.contact.id}
        variant={confirmDialog?.type === "delete" ? "danger" : "default"}
        onConfirm={async () => {
          if (!confirmDialog) return;
          if (confirmDialog.type === "delete") {
            await handleDelete(confirmDialog.contact);
          } else {
            await handleUnlink(confirmDialog.contact);
          }
          setConfirmDialog(null);
        }}
      />

      <div className="space-y-5">
        <RegistryToolbar
          searchValue={searchTerm}
          searchPlaceholder="Buscar por nome, cargo, CPF, email, telefone ou empresa..."
          onSearchChange={handleSearchChange}
          onClearSearch={() => handleSearchChange("")}
          resultLabel={`${pagination.total} filtrados`}
          filters={
            <RegistryFilterGroup
              value={scope}
              onChange={handleScopeChange}
              options={(Object.keys(SCOPE_LABELS) as ScopeFilter[]).map((key) => ({
                value: key,
                label: SCOPE_LABELS[key],
                count: counts[key],
              }))}
            />
          }
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => void refreshContactsView()}
                disabled={loadingList || !canSync}
              >
                {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={handleEvolutionSync}
                disabled={syncing || !canSync}
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizar
              </Button>
              {canCreate ? (
                <Button asChild size="sm" className="h-9 gap-2">
                  <Link href="/portal/contatos/novo">
                    <Plus className="h-4 w-4" />
                    Novo contato
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />

        <RegistryTableCard>
          <div className="divide-y divide-border/60 md:hidden">
            {loadingList ? (
              <LoadingBlock label="Carregando contatos..." />
            ) : filteredData.length === 0 ? (
              <RegistryEmptyState
                icon={Users}
                title="Nenhum contato encontrado"
                description="Ajuste os filtros ou cadastre um novo contato."
                searchTerm={searchTerm}
                onClear={() => handleSearchChange("")}
              />
            ) : (
              filteredData.map((contact) => (
                <MobileContactCard
                  key={contact.id}
                  contact={contact}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  isLoading={loadingId === contact.id}
                  onEdit={() => openEdit(contact)}
                  onUnlink={() => setConfirmDialog({ type: "unlink", contact })}
                  onDelete={() => setConfirmDialog({ type: "delete", contact })}
                />
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="w-[30%] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Empresas</TableHead>
                  <TableHead className="w-24 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <LoadingBlock label="Carregando contatos..." compact />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <RegistryEmptyState
                        icon={Users}
                        title="Nenhum contato encontrado"
                        description="Ajuste os filtros ou cadastre um novo contato."
                        searchTerm={searchTerm}
                        onClear={() => handleSearchChange("")}
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((contact, index) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      isLoading={loadingId === contact.id}
                      animationDelay={index * 25}
                      onEdit={() => openEdit(contact)}
                      onUnlink={() => setConfirmDialog({ type: "unlink", contact })}
                      onDelete={() => setConfirmDialog({ type: "delete", contact })}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </RegistryTableCard>

        <div className="flex flex-col gap-2">
          <RegistryPagination
            pagination={pagination}
            itemLabel={{ singular: "contato", plural: "contatos" }}
            isLoading={loadingList}
            onPageChange={setPage}
          />
          <div className="flex flex-col gap-1 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Itens nesta pagina: <span className="font-medium tabular-nums text-foreground">{filteredData.length}</span>
            </span>
            <span>
              Email: {counts.withEmail} | Telefone: {counts.withPhone}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function ContactRow({
  contact,
  canEdit,
  canDelete,
  isLoading,
  animationDelay,
  onEdit,
  onUnlink,
  onDelete,
}: {
  contact: ContactItem;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  animationDelay: number;
  onEdit: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  const linkedCount = getLinkedCount(contact);
  const companyNames = getCompanyNames(contact);
  const phone = getPrimaryPhone(contact);

  return (
    <ClickableTableRow
      enabled={canEdit}
      onOpen={onEdit}
      className="group/row border-border/50 transition-colors hover:bg-muted/30"
      style={{ animationDelay: `${animationDelay}ms` }}
      title="Clique para editar"
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/row:text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="max-w-72 truncate text-sm font-semibold text-foreground">{contact.name || "Sem nome"}</p>
            <div className="mt-0.5 flex max-w-72 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {contact.jobTitle ? (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Briefcase className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="truncate">{contact.jobTitle}</span>
                </span>
              ) : null}
              {contact.cpf ? (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Fingerprint className="h-3 w-3 shrink-0 opacity-60" />
                  {formatCpf(contact.cpf)}
                </span>
              ) : null}
              {!contact.jobTitle && !contact.cpf && contact.notes ? <span className="truncate">{contact.notes}</span> : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <ContactValue icon={Phone} value={phone} fallback="Nao informado" />
      </TableCell>
      <TableCell>
        <ContactValue icon={Mail} value={contact.email} fallback="Nao informado" />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <LinkedBadge count={linkedCount} />
          {companyNames ? <p className="max-w-72 truncate text-[11px] text-muted-foreground">{companyNames}</p> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <ContactActionsMenu
          contact={contact}
          canEdit={canEdit}
          canDelete={canDelete}
          isLoading={isLoading}
          onEdit={onEdit}
          onUnlink={onUnlink}
          onDelete={onDelete}
        />
      </TableCell>
    </ClickableTableRow>
  );
}

function MobileContactCard({
  contact,
  canEdit,
  canDelete,
  isLoading,
  onEdit,
  onUnlink,
  onDelete,
}: {
  contact: ContactItem;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  const linkedCount = getLinkedCount(contact);
  const companyNames = getCompanyNames(contact);
  const phone = getPrimaryPhone(contact);

  return (
    <ClickableCard
      enabled={canEdit}
      onOpen={onEdit}
      className="space-y-3 p-4"
      title="Clique para editar"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{contact.name || "Sem nome"}</p>
          {contact.jobTitle ? <p className="mt-1 truncate text-xs text-muted-foreground">{contact.jobTitle}</p> : null}
          <p className="mt-1 truncate text-xs text-muted-foreground">{phone || "Sem telefone"}</p>
        </div>
        <ContactActionsMenu
          contact={contact}
          canEdit={canEdit}
          canDelete={canDelete}
          isLoading={isLoading}
          onEdit={onEdit}
          onUnlink={onUnlink}
          onDelete={onDelete}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LinkedBadge count={linkedCount} />
        {contact.email ? (
          <span className="max-w-full truncate rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
            {contact.email}
          </span>
        ) : null}
        {contact.cpf ? (
          <span className="max-w-full truncate rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
            CPF {formatCpf(contact.cpf)}
          </span>
        ) : null}
      </div>
      {companyNames ? (
        <p className="truncate text-[11px] text-muted-foreground">
          <Building2 className="mr-1 inline h-3 w-3 opacity-60" />
          {companyNames}
        </p>
      ) : null}
    </ClickableCard>
  );
}

function ContactActionsMenu({
  contact,
  canEdit,
  canDelete,
  isLoading,
  onEdit,
  onUnlink,
  onDelete,
}: {
  contact: ContactItem;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  if (!canEdit && !canDelete) return null;

  const linkedCount = getLinkedCount(contact);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          disabled={isLoading}
          onClick={stopRecordClick}
          onDoubleClick={stopRecordClick}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          <span className="sr-only">Acoes do contato</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {contact.name || "Contato"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canEdit ? (
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-md"
            onClick={stopRecordClick}
            onSelect={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">Editar contato</span>
          </DropdownMenuItem>
        ) : null}

        {canEdit && linkedCount > 0 ? (
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-md"
            onClick={stopRecordClick}
            onSelect={(event) => {
              event.stopPropagation();
              onUnlink();
            }}
          >
            <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">Desvincular empresas</span>
          </DropdownMenuItem>
        ) : null}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-md text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20"
              onClick={stopRecordClick}
              onSelect={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Arquivar contato</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LinkedBadge({ count }: { count: number }) {
  if (count > 0) {
    return (
      <Badge variant="outline" className="rounded-md border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {count} {count === 1 ? "empresa" : "empresas"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-md border-zinc-500/30 bg-zinc-500/10 px-2 py-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
      Sem empresa
    </Badge>
  );
}

function ContactValue({ icon: Icon, value, fallback }: { icon: LucideIcon; value?: string | null; fallback: string }) {
  return (
    <span className={cn("inline-flex max-w-56 items-center gap-2 truncate text-sm", value ? "text-muted-foreground" : "text-muted-foreground/60")}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{value || fallback}</span>
    </span>
  );
}

function LoadingBlock({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", compact ? "" : "p-12")}>
      <Loader2 className="h-6 w-6 animate-spin opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
