"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/ConfirmActionDialog";
import { cn } from "@/lib/utils";

type ContactItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyId?: string | null;
  companyIds?: string[];
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  } | null;
  companies?: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  }>;
};

type ScopeFilter = "all" | "linked" | "unlinked";

interface ContactsTabProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const SCOPE_LABELS: Record<ScopeFilter, string> = {
  all: "Todos",
  linked: "Vinculados",
  unlinked: "Sem empresa",
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

export function ContactsTab({ canCreate, canEdit, canDelete }: ContactsTabProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: "delete" | "unlink"; contact: ContactItem } | null>(null);

  const loadContacts = async () => {
    setLoadingList(true);

    try {
      const params = new URLSearchParams();
      if (scope === "unlinked") params.set("unlinked", "true");
      if (scope === "linked") params.set("unlinked", "false");
      params.set("limit", "200");

      const response = await fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Falha ao carregar contatos (${response.status})`);

      const data = (await response.json()) as ContactItem[];
      setContacts(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar contatos";
      toast.error(message);
      setContacts([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const filteredData = useMemo(() => {
    const term = normalizeSearch(searchTerm);

    return contacts
      .filter((contact) => {
        if (!term) return true;

        const searchable = [
          contact.name,
          contact.email,
          contact.whatsapp,
          contact.phone,
          contact.notes,
          getCompanyNames(contact),
        ]
          .filter(Boolean)
          .join(" ");

        return normalizeSearch(searchable).includes(term);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base", numeric: true }));
  }, [contacts, searchTerm]);

  const counts = useMemo(() => {
    const linked = contacts.filter((contact) => getLinkedCount(contact) > 0).length;
    const withEmail = contacts.filter((contact) => Boolean(contact.email)).length;
    const withPhone = contacts.filter((contact) => Boolean(getPrimaryPhone(contact))).length;

    return {
      all: contacts.length,
      linked,
      unlinked: contacts.length - linked,
      withEmail,
      withPhone,
    };
  }, [contacts]);

  const openEdit = (contact: ContactItem) => {
    if (!canEdit) return;
    router.push(`/portal/contatos/${contact.id}/editar`);
  };

  const handleUnlink = async (contact: ContactItem) => {
    setLoadingId(contact.id);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: [] }),
      });
      if (!response.ok) throw new Error(`Falha ao desvincular (${response.status})`);

      const updated = (await response.json()) as ContactItem;
      setContacts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Empresas desvinculadas com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao desvincular";
      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (contact: ContactItem) => {
    setLoadingId(contact.id);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Falha ao excluir contato (${response.status})`);

      setContacts((current) => current.filter((item) => item.id !== contact.id));
      toast.success("Contato excluido com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao excluir contato";
      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleEvolutionSync = async () => {
    setSyncing(true);

    try {
      const response = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Falha ao sincronizar contatos (${response.status})`);
      }

      toast.success(payload?.message || "Sincronizacao concluida.");
      await loadContacts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao sincronizar contatos";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <ConfirmActionDialog
        open={!!confirmDialog}
        onOpenChange={(open) => (!open ? setConfirmDialog(null) : undefined)}
        title={confirmDialog?.type === "delete" ? "Confirmar exclusao do contato" : "Confirmar desvinculacao"}
        description={
          confirmDialog
            ? confirmDialog.type === "delete"
              ? `Deseja excluir o contato "${confirmDialog.contact.name}"? Essa acao e irreversivel.`
              : `Deseja desvincular todas as empresas do contato "${confirmDialog.contact.name}"?`
            : ""
        }
        confirmLabel={confirmDialog?.type === "delete" ? "Excluir contato" : "Confirmar"}
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
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard title="Total" value={counts.all} description="Contatos cadastrados" icon={Users} tone="info" />
          <MetricCard title="Vinculados" value={counts.linked} description="Com ao menos uma empresa" icon={Building2} tone="success" />
          <MetricCard title="Sem empresa" value={counts.unlinked} description="Pendentes de vinculo" icon={UserRound} tone="neutral" />
        </div>

        <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2">
                  {(Object.keys(SCOPE_LABELS) as ScopeFilter[]).map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant={scope === key ? "default" : "outline"}
                      size="sm"
                      className="h-9"
                      onClick={() => setScope(key)}
                    >
                      {SCOPE_LABELS[key]} ({counts[key]})
                    </Button>
                  ))}
                </div>
              </div>

              <div className="group relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou empresa..."
                  className="h-9 rounded-md border-border/60 bg-background pl-10 pr-9 text-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:mr-1">
                <Search className="h-3.5 w-3.5" />
                {filteredData.length} filtrados
              </span>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void loadContacts()} disabled={loadingList}>
                {loadingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleEvolutionSync} disabled={syncing}>
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
            </div>
          </div>
        </section>

        <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="divide-y divide-border/60 md:hidden">
            {loadingList ? (
              <LoadingBlock label="Carregando contatos..." />
            ) : filteredData.length === 0 ? (
              <EmptyBlock />
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
                      <EmptyBlock compact />
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
        </Card>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Total filtrado: {filteredData.length}</span>
          <span>
            Email: {counts.withEmail} | Telefone: {counts.withPhone}
          </span>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "info" | "success" | "neutral";
}) {
  const toneClass = {
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  }[tone];

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
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
    <TableRow
      className={cn("group/row border-border/50 transition-colors hover:bg-muted/30", canEdit && "cursor-pointer")}
      style={{ animationDelay: `${animationDelay}ms` }}
      onDoubleClick={onEdit}
      title={canEdit ? "Clique duas vezes para editar" : undefined}
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/row:text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="max-w-72 truncate text-sm font-semibold text-foreground">{contact.name || "Sem nome"}</p>
            {contact.notes ? <p className="max-w-72 truncate text-[11px] text-muted-foreground">{contact.notes}</p> : null}
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
    </TableRow>
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
    <div className={cn("space-y-3 p-4", canEdit && "cursor-pointer")} onDoubleClick={onEdit}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{contact.name || "Sem nome"}</p>
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
      </div>
      {companyNames ? (
        <p className="truncate text-[11px] text-muted-foreground">
          <Building2 className="mr-1 inline h-3 w-3 opacity-60" />
          {companyNames}
        </p>
      ) : null}
    </div>
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
          onDoubleClick={(event) => event.stopPropagation()}
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
          <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">Editar contato</span>
          </DropdownMenuItem>
        ) : null}

        {canEdit && linkedCount > 0 ? (
          <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md" onClick={onUnlink}>
            <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">Desvincular empresas</span>
          </DropdownMenuItem>
        ) : null}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Excluir contato</span>
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

function EmptyBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center text-muted-foreground", compact ? "" : "p-8")}>
      <div className="rounded-full bg-muted/40 p-4">
        <Users className="h-8 w-8 opacity-40" />
      </div>
      <div>
        <p className="font-medium text-foreground">Nenhum contato encontrado</p>
        <p className="mt-1 text-xs">Ajuste os filtros ou cadastre um novo contato.</p>
      </div>
    </div>
  );
}
