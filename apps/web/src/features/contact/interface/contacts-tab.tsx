"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ContactListItem, type ContactStats as ContactStatsContract } from "@dosc-syspro/contracts/contact";
import { type ColumnDef } from "@tanstack/react-table";
import { formatCpf } from "@dosc-syspro/shared";
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
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Badge, Button, ColumnToggleDropdown, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, TableCell, TableRow, TableHead, DropdownMenuCheckboxItem } from "@dosc-syspro/ui";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import { ClickableCard, ClickableTableRow, stopRecordClick } from "@/components/platform/shared/clickable-record";
import {
  RegistryFilterGroup,
  RegistryPagination,
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

export function ContactsTab({ canCreate, canEdit, canDelete, canSync }: ContactsTabProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    phone: true,
    email: true,
    companies: true,
  });
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
    return contacts;
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

  const emptyStateDescription = useMemo(() => {
    if (searchTerm.trim()) {
      return "Tente outro nome, cargo, documento, canal ou empresa para ampliar o recorte.";
    }

    if (scope === "linked") {
      return "Nenhum contato vinculado a empresas apareceu neste recorte.";
    }

    if (scope === "unlinked") {
      return "Nenhum contato sem empresa ficou pendente neste recorte.";
    }

    return "Ajuste os filtros ou cadastre um novo contato.";
  }, [scope, searchTerm]);

  const handleScopeChange = (nextScope: ScopeFilter) => {
    setPage(1);
    setScope(nextScope);
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearchTerm(value);
  };

  const openEdit = useCallback((contact: ContactItem) => {
    if (!canEdit) return;
    router.push(`/portal/contatos/${contact.id}/editar`);
  }, [canEdit, router]);

  const columns = useMemo<ColumnDef<ContactItem>[]>(() => [
    {
      accessorKey: "name",
      id: "contact",
      header: "Contato",
      meta: { className: "w-[30%]" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors group-hover/row:text-foreground">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="max-w-72 truncate text-sm font-semibold text-foreground">{row.original.name || "Sem nome"}</p>
            <div className="mt-0.5 flex max-w-72 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {row.original.jobTitle ? (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Briefcase className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="truncate">{row.original.jobTitle}</span>
                </span>
              ) : null}
              {row.original.cpf ? (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Fingerprint className="h-3 w-3 shrink-0 opacity-60" />
                  {formatCpf(row.original.cpf)}
                </span>
              ) : null}
              {!row.original.jobTitle && !row.original.cpf && row.original.notes ? <span className="truncate">{row.original.notes}</span> : null}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      id: "phone",
      header: "Telefone",
      cell: ({ row }) => (
        <ContactValue icon={Phone} value={getPrimaryPhone(row.original)} fallback="Nao informado" />
      ),
    },
    {
      accessorKey: "email",
      id: "email",
      header: "Email",
      cell: ({ row }) => (
        <ContactValue icon={Mail} value={row.original.email} fallback="Nao informado" />
      ),
    },
    {
      id: "companies",
      header: "Empresas",
      enableSorting: false,
      cell: ({ row }) => {
        const linkedCount = getLinkedCount(row.original);
        const companyNames = getCompanyNames(row.original);
        return (
          <div className="space-y-1">
            <LinkedBadge count={linkedCount} />
            {companyNames ? <p className="max-w-72 truncate text-[11px] text-muted-foreground">{companyNames}</p> : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Acoes</div>,
      meta: { className: "w-24 text-right" },
      enableSorting: false,
      cell: ({ row }) => (
        <ContactActionsMenu
          contact={row.original}
          canEdit={canEdit}
          canDelete={canDelete}
          isLoading={loadingId === row.original.id}
          onEdit={() => openEdit(row.original)}
          onUnlink={() => setConfirmDialog({ type: "unlink", contact: row.original })}
          onDelete={() => setConfirmDialog({ type: "delete", contact: row.original })}
        />
      ),
    },
  ], [canDelete, canEdit, loadingId]);

  const renderMobileItem = useCallback(
    (contact: ContactItem) => (
      <MobileContactCard
        contact={contact}
        canEdit={canEdit}
        canDelete={canDelete}
        isLoading={loadingId === contact.id}
        onEdit={() => openEdit(contact)}
        onUnlink={() => setConfirmDialog({ type: "unlink", contact })}
        onDelete={() => setConfirmDialog({ type: "delete", contact })}
      />
    ),
    [canDelete, canEdit, loadingId, openEdit],
  );

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

            </>
          }
        />

        <div className="space-y-4">
          {/* Barra de Ferramentas da Tabela: Exibição & Colunas (Coesão de Layout Premium) */}
          <div className="flex items-center justify-between px-0.5">
            <div className="text-xs text-muted-foreground font-medium">
              {pagination.total > 0 && contacts.length > 0 && (
                <span>
                  Exibindo{" "}
                  <span className="font-semibold text-foreground">
                    {(pagination.page - 1) * pagination.pageSize + 1}–
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-foreground">{pagination.total}</span>{" "}
                  {pagination.total === 1 ? "contato" : "contatos"}
                </span>
              )}
            </div>
            <div className="hidden md:block">
              <ColumnToggleDropdown
                columns={[
                  { key: "phone", label: "Telefone" },
                  { key: "email", label: "Email" },
                  { key: "companies", label: "Empresas" },
                ]}
                visibility={columnVisibility}
                onVisibilityChange={(key, visible) =>
                  setColumnVisibility((prev) => ({ ...prev, [key]: visible }))
                }
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredData}
            flexible={true}
            loading={loadingList}
            loadingLabel="Carregando contatos..."
            minWidthClassName="min-w-[920px]"
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            emptyState={{
              title: "Nenhum contato encontrado",
              description: emptyStateDescription,
              icon: Users,
            }}
            rowClassName="border-border/50 hover:bg-muted/20 transition-colors"
            onRowClick={canEdit ? openEdit : undefined}
            renderMobileItem={renderMobileItem}
          />

          <RegistryPagination
            pagination={pagination}
            itemLabel={{ singular: "contato", plural: "contatos" }}
            isLoading={loadingList}
            onPageChange={setPage}
          />
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
      className="group/row border-border/50 transition-colors hover:bg-muted/20 data-[state=open]:bg-muted/20"
      style={{ animationDelay: `${animationDelay}ms` }}
      title="Clique para editar"
    >
      <TableCell className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors group-hover/row:text-foreground">
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
      className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm"
      title="Clique para editar"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
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
          <span className="max-w-full truncate rounded-lg border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
            {contact.email}
          </span>
        ) : null}
        {contact.cpf ? (
          <span className="max-w-full truncate rounded-lg border border-border/50 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
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
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/60 p-1.5 shadow-lg">
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
            {/* ds-allow: status */}
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-md text-destructive focus:bg-destructive/10 focus:text-destructive"
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
      <Badge variant="success" className="rounded-lg px-2 py-1 text-[10px] font-semibold tracking-wide">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {count} {count === 1 ? "empresa" : "empresas"}
      </Badge>
    );
  }

  return (
    <Badge variant="muted" className="rounded-lg px-2 py-1 text-[10px] font-semibold tracking-wide">
      Sem empresa
    </Badge>
  );
}

function ContactValue({ icon: Icon, value, fallback }: { icon: LucideIcon; value?: string | null; fallback: string }) {
  return (
    <span className={cn("inline-flex max-w-56 items-center gap-2 truncate text-[13px]", value ? "text-muted-foreground" : "text-muted-foreground/60")}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{value || fallback}</span>
    </span>
  );
}
