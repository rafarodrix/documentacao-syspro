import { useEffect, useMemo, useState } from "react";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { ContactOption } from "@dosc-syspro/contracts/contact";
import { buildSearchText, includesNormalizedSearch } from "@dosc-syspro/shared";
import { trpc } from "@/lib/api/trpc-client";
import { normalizeDigits, getCompanyLabel } from "../chatwoot-dashboard-ui";
import type { ContactCompanyEntry, ContactLookupEntry, FeedbackState } from "../chatwoot-dashboard-types";

interface UseContactBindingParams {
  customerPhone: string;
  customerEmail: string;
  conversationId: string;
  accountId: string;
  chatwootContactId: string;
  companyId: string;
  companyName: string;
  contactName: string;
  manualLinkedCompany: CompanyOption | null;
  setManualLinkedCompany: (company: CompanyOption | null) => void;
  onBindSuccess?: () => void;
}

export function useChatwootContactBinding({
  customerPhone,
  customerEmail,
  conversationId,
  accountId,
  chatwootContactId,
  companyId,
  companyName,
  contactName,
  manualLinkedCompany,
  setManualLinkedCompany,
  onBindSuccess,
}: UseContactBindingParams) {
  const [portalContactMatch, setPortalContactMatch] = useState<ContactLookupEntry | null>(null);
  const [isLoadingPortalContact, setIsLoadingPortalContact] = useState(false);
  const [contactLookupError, setContactLookupError] = useState<string | null>(null);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [isLoadingCompanyOptions, setIsLoadingCompanyOptions] = useState(false);
  const [companyOptionsError, setCompanyOptionsError] = useState<string | null>(null);
  const [hasLoadedCompanyOptions, setHasLoadedCompanyOptions] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isBindingCompany, setIsBindingCompany] = useState(false);
  const [companyBindingFeedback, setCompanyBindingFeedback] = useState<FeedbackState>(null);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [isSavingContactName, setIsSavingContactName] = useState(false);

  const trimmedCompanySearchTerm = companySearchTerm.trim();
  const shouldSearchCompanies = !companyId && trimmedCompanySearchTerm.length >= 2;

  const filteredCompanyOptions = useMemo(() => {
    const q = companySearchTerm.trim();
    if (!q) return companyOptions.slice(0, 8);
    return companyOptions
      .filter((company) =>
        includesNormalizedSearch(buildSearchText([company.nomeFantasia, company.razaoSocial]), q),
      )
      .slice(0, 8);
  }, [companyOptions, companySearchTerm]);

  const selectedCompanyOption = useMemo(
    () => companyOptions.find((company) => company.id === selectedCompanyId) ?? null,
    [companyOptions, selectedCompanyId],
  );

  const linkedCompanies = useMemo(() => {
    const byId = new Map<string, ContactCompanyEntry>();
    for (const company of portalContactMatch?.companies ?? []) {
      if (company?.id) byId.set(company.id, company);
    }
    if (manualLinkedCompany?.id) {
      byId.set(manualLinkedCompany.id, {
        id: manualLinkedCompany.id,
        razaoSocial: manualLinkedCompany.razaoSocial,
        nomeFantasia: manualLinkedCompany.nomeFantasia ?? null,
      });
    }
    if (byId.size === 0 && companyId) {
      byId.set(companyId, {
        id: companyId,
        razaoSocial: companyName || companyId,
        nomeFantasia: companyName || null,
      });
    }
    return Array.from(byId.values());
  }, [manualLinkedCompany, portalContactMatch?.companies, companyId, companyName]);

  const primaryCompany = useMemo(
    () =>
      linkedCompanies.find((company) => company.id === companyId) ??
      (linkedCompanies.length === 1 ? linkedCompanies[0] ?? null : null),
    [linkedCompanies, companyId],
  );

  const contactEditHref = portalContactMatch?.id ? `/portal/contatos/${portalContactMatch.id}/editar` : "";

  const effectiveContactName =
    contactNameDraft.trim() || portalContactMatch?.name || contactName || "Contato Chatwoot";

  // Sync contact name draft from resolved context
  useEffect(() => {
    setContactNameDraft((current) => {
      if (current.trim()) return current;
      return portalContactMatch?.name || contactName || "";
    });
  }, [portalContactMatch?.name, contactName]);

  // Auto-link when only one company is available and none is active
  useEffect(() => {
    if (manualLinkedCompany?.id) return;
    if (companyId) return;
    if (linkedCompanies.length !== 1) return;

    const [onlyCompany] = linkedCompanies;
    setManualLinkedCompany({
      id: onlyCompany.id,
      razaoSocial: onlyCompany.razaoSocial,
      nomeFantasia: onlyCompany.nomeFantasia ?? null,
    });
  }, [linkedCompanies, manualLinkedCompany?.id, companyId, setManualLinkedCompany]);

  // Load company options lazily (once, only when needed)
  useEffect(() => {
    if (companyId) return;
    if (!shouldSearchCompanies) {
      setCompanyOptionsError(null);
      setIsLoadingCompanyOptions(false);
      return;
    }
    if (hasLoadedCompanyOptions) return;

    const controller = new AbortController();

    async function loadCompanyOptions() {
      try {
        setIsLoadingCompanyOptions(true);
        setCompanyOptionsError(null);
        const json = await trpc.companies.getOptions.query();
        setCompanyOptions(Array.isArray(json) ? json : []);
        setHasLoadedCompanyOptions(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCompanyOptions([]);
        setCompanyOptionsError("Nao foi possivel buscar as empresas para vinculo.");
      } finally {
        setIsLoadingCompanyOptions(false);
      }
    }

    void loadCompanyOptions();
    return () => controller.abort();
  }, [hasLoadedCompanyOptions, companyId, shouldSearchCompanies]);

  // Lookup portal contact by phone or email
  useEffect(() => {
    const phone = normalizeDigits(customerPhone);
    const email = customerEmail.trim().toLowerCase();
    const q = phone || email;
    if (!q) {
      setPortalContactMatch(null);
      setContactLookupError("Sem telefone ou e-mail para localizar o contato no portal.");
      return;
    }

    const controller = new AbortController();

    async function loadPortalContact() {
      try {
        setIsLoadingPortalContact(true);
        setContactLookupError(null);
        const result = await trpc.contacts.list.query({ q, page: "1", pageSize: "10" });
        const entries = result.items as ContactLookupEntry[];
        const matched =
          entries.find((entry) => {
            const entryWhatsapp = normalizeDigits(String(entry.whatsapp || ""));
            const entryPhone = normalizeDigits(String(entry.phone || ""));
            const entryEmail = String(entry.email || "").trim().toLowerCase();
            return Boolean(
              (phone && (entryWhatsapp === phone || entryPhone === phone)) ||
                (email && entryEmail === email),
            );
          }) ?? null;
        setPortalContactMatch(matched as ContactLookupEntry | null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setPortalContactMatch(null);
        setContactLookupError("Nao foi possivel verificar se o contato ja existe no portal.");
      } finally {
        setIsLoadingPortalContact(false);
      }
    }

    void loadPortalContact();
    return () => controller.abort();
  }, [customerEmail, customerPhone]);

  async function handleBindCompany() {
    if (!selectedCompanyOption || isBindingCompany) return;

    try {
      setIsBindingCompany(true);
      setCompanyBindingFeedback(null);

      let updatedContact: ContactLookupEntry | null = null;
      if (portalContactMatch?.id) {
        const currentCompanyIds = portalContactMatch.companies?.map((c) => c.id) || (portalContactMatch as unknown as { companyIds?: string[] }).companyIds || [];
        const nextCompanyIds = Array.from(new Set([...currentCompanyIds, selectedCompanyOption.id]));
        const result = await trpc.contacts.update.mutate({
          id: portalContactMatch.id,
          data: { companyIds: nextCompanyIds },
        });
        updatedContact = result as unknown as ContactLookupEntry;
      } else {
        const result = await trpc.contacts.create.mutate({
          name: effectiveContactName,  // uses internally computed value
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
          whatsapp: customerPhone || undefined,
          notes: "Contato criado/vinculado pelo Dashboard App do Chatwoot.",
          companyIds: [selectedCompanyOption.id],
        });
        updatedContact = result as unknown as ContactLookupEntry;
      }

      setPortalContactMatch(updatedContact?.id ? updatedContact : portalContactMatch);
      setManualLinkedCompany(selectedCompanyOption);
      const portalContactId = updatedContact?.id ?? portalContactMatch?.id;
      if (!portalContactId || !conversationId || !accountId) {
        throw new Error("Nao foi possivel registrar o contexto da conversa.");
      }
      const contextResponse = await fetch(
        `/api/chatwoot/conversations/${encodeURIComponent(conversationId)}/company-context`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: selectedCompanyOption.id,
            accountId,
            contactId: chatwootContactId || null,
            portalContactId,
            linkSource: "MANUAL",
          }),
        },
      );
      if (!contextResponse.ok) {
        throw new Error("Nao foi possivel registrar o contexto da conversa.");
      }
      setCompanyBindingFeedback({
        tone: "success",
        message: `Contato vinculado a ${getCompanyLabel(selectedCompanyOption)}. A sincronizacao com o Chatwoot foi colocada na fila.`,
      });
      onBindSuccess?.();
    } catch {
      setCompanyBindingFeedback({
        tone: "error",
        message: "Nao foi possivel vincular a empresa ao contato.",
      });
    } finally {
      setIsBindingCompany(false);
    }
  }

  async function handleSaveContactName() {
    const nextName = contactNameDraft.trim();
    if (!nextName || isSavingContactName) return;

    try {
      setIsSavingContactName(true);
      setCompanyBindingFeedback(null);

      let updatedContact: ContactLookupEntry | null = null;
      if (portalContactMatch?.id) {
        const result = await trpc.contacts.update.mutate({
          id: portalContactMatch.id,
          data: { name: nextName },
        });
        updatedContact = result as unknown as ContactLookupEntry;
      } else {
        const result = await trpc.contacts.create.mutate({
          name: nextName,
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
          whatsapp: customerPhone || undefined,
          notes: "Contato criado pelo Dashboard App do Chatwoot ao renomear.",
        });
        updatedContact = result as unknown as ContactLookupEntry;
      }

      if (updatedContact?.id) {
        setPortalContactMatch(updatedContact);
      }
      setCompanyBindingFeedback({
        tone: "success",
        message: portalContactMatch?.id
          ? "Nome do contato atualizado no portal e sincronizado com o Chatwoot."
          : "Contato registrado no portal e sincronizado com o Chatwoot.",
      });
    } catch {
      setCompanyBindingFeedback({
        tone: "error",
        message: "Nao foi possivel salvar o nome do contato.",
      });
    } finally {
      setIsSavingContactName(false);
    }
  }

  return {
    portalContactMatch,
    setPortalContactMatch,
    isLoadingPortalContact,
    contactLookupError,
    companyOptions,
    isLoadingCompanyOptions,
    companyOptionsError,
    companySearchTerm,
    setCompanySearchTerm,
    selectedCompanyId,
    setSelectedCompanyId,
    isBindingCompany,
    companyBindingFeedback,
    setCompanyBindingFeedback,
    contactNameDraft,
    setContactNameDraft,
    isSavingContactName,
    filteredCompanyOptions,
    selectedCompanyOption,
    shouldSearchCompanies,
    linkedCompanies,
    primaryCompany,
    contactEditHref,
    effectiveContactName,
    handleBindCompany,
    handleSaveContactName,
  };
}
