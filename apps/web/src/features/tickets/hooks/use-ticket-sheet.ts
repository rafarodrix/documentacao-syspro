"use client";

import { useState, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormInput, type TicketFormOutput } from "@dosc-syspro/contracts";
import { createTicketAction } from "@/features/tickets/application/actions";
import { toast } from "sonner";

export function useTicketSheet(onSuccess: () => void) {
    const [files, setFiles] = useState<File[]>([]);
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

    const onSubmit = (data: TicketFormOutput) => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("subject", data.subject);
            formData.append("description", data.description);
            formData.append("priority", data.priority);
            formData.append("type", data.type);

            files.forEach((file) => {
                formData.append("attachments", file);
            });

            const result = await createTicketAction(null, formData);

            if (result.success) {
                toast.success("Chamado aberto com sucesso!");
                form.reset();
                setFiles([]);
                onSuccess();
            } else {
                toast.error(result.message || "Erro ao criar chamado.");
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
    };
}
