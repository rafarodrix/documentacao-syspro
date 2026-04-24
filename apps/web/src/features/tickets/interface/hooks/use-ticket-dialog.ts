"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormInput, type TicketFormOutput } from "@dosc-syspro/contracts/ticket";
import { DEFAULT_TICKET_MODULE_SETTINGS } from "@dosc-syspro/contracts/ticket";
import { createTicketAction, getUserLinkedCompaniesAction } from "@/features/tickets/application/ticket-actions";
import {
    getSuggestedCategoryForTeam,
    useTicketModuleSettings,
} from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { toast } from "sonner";

type UseTicketDialogOptions = {
    isSystemUser?: boolean;
};

type CustomerEmailOption = {
    companyId: string;
    email: string;
    companyName: string;
    contactName: string | null;
};

type CompanyOption = {
    id: string;
    name: string;
};

export function useTicketDialog(onSuccess: () => void, options: UseTicketDialogOptions = {}) {
    const searchParams = useSearchParams();
    const [files, setFiles] = useState<File[]>([]);
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerCompany, setCustomerCompany] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [customerOptions, setCustomerOptions] = useState<CustomerEmailOption[]>([]);
    const [customerOptionsError, setCustomerOptionsError] = useState<string | null>(null);
    const [clientCompanies, setClientCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const ticketSettings = useTicketModuleSettings();
    const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value ?? "incident");
    const [selectedModule, setSelectedModule] = useState<string>(DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value ?? "");
    const [selectedTeam, setSelectedTeam] = useState<string>(
        options.isSystemUser ? DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam : "SUPORTE",
    );
    const [databaseUrl, setDatabaseUrl] = useState("");
    const [developmentVideoUrl, setDevelopmentVideoUrl] = useState("");
    const [isCustomerOptionsLoading, setIsCustomerOptionsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const diagPrefix = "[TicketsDiag][useTicketDialog]";

    const logInfo = (event: string, payload?: Record<string, unknown>) => {
        console.info(diagPrefix, {
            event,
            at: new Date().toISOString(),
            isSystemUser: options.isSystemUser ?? false,
            ...payload,
        });
    };

    const logError = (event: string, error: unknown, payload?: Record<string, unknown>) => {
        const normalized = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) };
        console.error(diagPrefix, {
            event,
            at: new Date().toISOString(),
            isSystemUser: options.isSystemUser ?? false,
            ...payload,
            error: normalized,
        });
    };

    const form = useForm<TicketFormInput, undefined, TicketFormOutput>({
        resolver: zodResolver(ticketFormSchema),
        defaultValues: {
            subject: "",
            type: "incident",
            description: "",
            priority: "2 normal",
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const totalSize = [...files, ...newFiles].reduce((acc, f) => acc + f.size, 0);
            logInfo("files.change", { newFilesCount: newFiles.length, totalSize });

            if (totalSize > 5 * 1024 * 1024) {
                toast.error("O tamanho total dos arquivos nao pode exceder 5MB.");
                return;
            }
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    useEffect(() => {
        try {
            const nextTeam = options.isSystemUser ? ticketSettings.defaultTeam : "SUPORTE";
            setSelectedTeam(nextTeam);
            setSelectedCategory(
                getSuggestedCategoryForTeam(ticketSettings, nextTeam) ||
                ticketSettings.categories[0]?.value ||
                "incident",
            );
            setSelectedModule((current) => current || ticketSettings.modules[0]?.value || "");
        } catch (error) {
            logError("ticket_settings.apply_failed", error);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketSettings, options.isSystemUser]);

    useEffect(() => {
        if (!options.isSystemUser) {
            getUserLinkedCompaniesAction().then((res) => {
                if (res.success && res.data) {
                    setClientCompanies(res.data);
                    if (res.data.length === 1) {
                        setSelectedCompanyId(res.data[0].id);
                    }
                }
            }).catch(e => {
                logError("client_companies.fetch_failed", e);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.isSystemUser]);

    useEffect(() => {
        if (!options.isSystemUser) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsCustomerOptionsLoading(true);
                const params = new URLSearchParams();
                params.set("q", searchQuery.trim());
                params.set("limit", "15");
                const response = await fetch(`/api/platform/tickets/customer-emails?${params.toString()}`, {
                    method: "GET",
                    signal: controller.signal,
                });
                if (!response.ok) {
                    const json = (await response.json().catch(() => null)) as { error?: string } | null;
                    const message = json?.error || "Falha ao consultar empresas.";
                    logInfo("customer_emails.non_ok_response", { status: response.status, query: searchQuery.trim(), message });
                    setCustomerOptionsError(message);
                    setCustomerOptions([]);
                    return;
                }
                const json = (await response.json()) as { options?: CustomerEmailOption[] };
                setCustomerOptionsError(null);
                setCustomerOptions(Array.isArray(json.options) ? json.options : []);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    logError("customer_emails.fetch_failed", error, { query: searchQuery.trim() });
                    setCustomerOptionsError("Falha ao consultar empresas.");
                    setCustomerOptions([]);
                }
            } finally {
                setIsCustomerOptionsLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, options.isSystemUser]);

    const onSubmit = (data: TicketFormOutput) => {
        logInfo("submit.invoked", { filesCount: files.length, hasCustomerEmail: Boolean(customerEmail.trim()), hasCompanyId: Boolean(selectedCompanyId) });
        if (options.isSystemUser && !customerEmail.trim() && !selectedCompanyId) {
            toast.error("Selecione a empresa ou contato do cliente para abrir o chamado.");
            return;
        }

        startTransition(async () => {
            try {
                logInfo("submit.start_transition");
                const formData = new FormData();
                formData.append("subject", data.subject);
                formData.append("description", data.description);
                formData.append("priority", data.priority);
                formData.append("type", data.type);
                if (options.isSystemUser) {
                    if (customerEmail.trim()) {
                        formData.append("customerEmail", customerEmail.trim().toLowerCase());
                    }
                    if (selectedCompanyId) {
                        formData.append("companyId", selectedCompanyId);
                    }
                } else if (selectedCompanyId) {
                    formData.append("userSelectedCompanyId", selectedCompanyId);
                }
                if (selectedCategory) formData.append("category", selectedCategory);
                if (selectedModule) formData.append("module", selectedModule);
                if (selectedTeam) formData.append("team", selectedTeam);
                if (databaseUrl.trim()) formData.append("databaseUrl", databaseUrl.trim());
                if (developmentVideoUrl.trim()) formData.append("developmentVideoUrl", developmentVideoUrl.trim());
                const source = searchParams?.get("source") || "";
                const chatwootConversationId = searchParams?.get("chatwootConversationId") || "";
                const chatwootContactId = searchParams?.get("chatwootContactId") || "";
                const chatwootAccountId = searchParams?.get("chatwootAccountId") || "";
                const chatwootConversationUrl = searchParams?.get("chatwootConversationUrl") || "";
                const customerName = searchParams?.get("customerName") || "";
                const customerPhone = searchParams?.get("customerPhone") || "";
                const customerWhatsapp = searchParams?.get("customerWhatsapp") || "";

                if (source) formData.append("source", source);
                if (chatwootConversationId) formData.append("chatwootConversationId", chatwootConversationId);
                if (chatwootContactId) formData.append("chatwootContactId", chatwootContactId);
                if (chatwootAccountId) formData.append("chatwootAccountId", chatwootAccountId);
                if (chatwootConversationUrl) formData.append("chatwootConversationUrl", chatwootConversationUrl);
                if (customerName) formData.append("customerName", customerName);
                if (customerPhone) formData.append("customerPhone", customerPhone);
                if (customerWhatsapp) formData.append("customerWhatsapp", customerWhatsapp);

                files.forEach((file) => {
                    formData.append("attachments", file);
                });

                const result = await createTicketAction(null, formData);
                logInfo("submit.result", { success: result.success, message: result.message });

                if (result.success) {
                    toast.success("Chamado aberto com sucesso!");
                    form.reset();
                    setFiles([]);
                    setCustomerEmail("");
                    setCustomerCompany(null);
                    setSearchQuery("");
                    setDatabaseUrl("");
                    setDevelopmentVideoUrl("");
                    if (clientCompanies.length > 0) {
                        setSelectedCompanyId(clientCompanies.length === 1 ? clientCompanies[0].id : "");
                    }
                    onSuccess();
                } else {
                    toast.error(result.message || "Erro ao criar chamado.");
                }
            } catch (error) {
                logError("submit.failed", error);
                const message = error instanceof Error ? error.message : "Erro inesperado ao criar chamado.";
                toast.error(message);
            }
        });
    };

    return {
        form,
        files,
        isPending,
        fileInputRef,
        handleFileChange,
        removeFile,
        triggerFileInput,
        onSubmit: form.handleSubmit(onSubmit),
        customerEmail,
        setCustomerEmail,
        customerCompany,
        setCustomerCompany,
        setSearchQuery,
        customerOptions,
        customerOptionsError,
        isCustomerOptionsLoading,
        clientCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        ticketSettings,
        selectedCategory,
        setSelectedCategory,
        selectedModule,
        setSelectedModule,
        selectedTeam,
        setSelectedTeam,
        databaseUrl,
        setDatabaseUrl,
        developmentVideoUrl,
        setDevelopmentVideoUrl,
    };
}
