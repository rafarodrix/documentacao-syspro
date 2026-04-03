"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormInput, type TicketFormOutput } from "@dosc-syspro/contracts";
import { createTicketAction } from "@/features/tickets/application/actions";
import { toast } from "sonner";

type UseTicketSheetOptions = {
    isSystemUser?: boolean;
};

type CustomerEmailOption = {
    email: string;
    companyName: string;
};

export function useTicketSheet(onSuccess: () => void, options: UseTicketSheetOptions = {}) {
    const [files, setFiles] = useState<File[]>([]);
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerCompany, setCustomerCompany] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [customerOptions, setCustomerOptions] = useState<CustomerEmailOption[]>([]);
    const [isCustomerOptionsLoading, setIsCustomerOptionsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!options.isSystemUser) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                if (!searchQuery.trim()) {
                    setCustomerOptions([]);
                    return;
                }
                setIsCustomerOptionsLoading(true);
                const params = new URLSearchParams();
                params.set("q", searchQuery.trim());
                params.set("limit", "15");
                const response = await fetch(`/api/platform/tickets/customer-emails?${params.toString()}`, {
                    method: "GET",
                    signal: controller.signal,
                });
                if (!response.ok) {
                    setCustomerOptions([]);
                    return;
                }
                const json = (await response.json()) as { options?: CustomerEmailOption[] };
                setCustomerOptions(Array.isArray(json.options) ? json.options : []);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
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
    }, [searchQuery, options.isSystemUser]);

    const onSubmit = (data: TicketFormOutput) => {
        if (options.isSystemUser && !customerEmail.trim()) {
            toast.error("Informe o e-mail do cliente para abrir o chamado.");
            return;
        }

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("subject", data.subject);
                formData.append("description", data.description);
                formData.append("priority", data.priority);
                formData.append("type", data.type);
                if (options.isSystemUser) {
                    formData.append("customerEmail", customerEmail.trim().toLowerCase());
                }

                files.forEach((file) => {
                    formData.append("attachments", file);
                });

                const result = await createTicketAction(null, formData);

                if (result.success) {
                    toast.success("Chamado aberto com sucesso!");
                    form.reset();
                    setFiles([]);
                    setCustomerEmail("");
                    setCustomerCompany(null);
                    setSearchQuery("");
                    onSuccess();
                } else {
                    toast.error(result.message || "Erro ao criar chamado.");
                }
            } catch (error) {
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
        searchQuery,
        setSearchQuery,
        customerOptions,
        isCustomerOptionsLoading,
    };
}
