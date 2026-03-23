"use client";

import { useState, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, TicketFormInput } from "@/core/application/schema/ticket-form.schema";
import { ticketGateway } from "@/core/infrastructure/gateways/ticket-gateway";
import { toast } from "sonner";

export function useTicketSheet(onSuccess: () => void) {
    const [files, setFiles] = useState<File[]>([]);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<any>({
        resolver: zodResolver(ticketFormSchema),
        defaultValues: {
            subject: "",
            type: "incident",
            description: "",
            priority: "2 normal",
        },
    });

    // Lógica de Arquivos
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const totalSize = [...files, ...newFiles].reduce((acc, f) => acc + f.size, 0);

            if (totalSize > 5 * 1024 * 1024) {
                toast.error("O tamanho total dos arquivos não pode exceder 5MB.");
                return;
            }
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    // Submit
    const onSubmit = (data: TicketFormInput) => {
        startTransition(async () => {
            const result = await ticketGateway.create(data, files);

            if (result.success) {
                toast.success("Chamado aberto com sucesso!");
                form.reset();
                setFiles([]);
                onSuccess(); // Fecha o modal
            } else {
                toast.error(result.error || "Erro ao criar chamado.");
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