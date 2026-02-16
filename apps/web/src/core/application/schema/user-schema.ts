import { z } from "zod";
import { Role } from "@prisma/client";

// Regex simples para telefone BR (com ou sem máscara)
const phoneRegex = /^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/;

export const createUserSchema = z.object({
    name: z.string()
        .min(3, "O nome deve ter no mínimo 3 caracteres")
        .trim(),

    email: z.string()
        .email("Insira um e-mail válido")
        .toLowerCase()
        .trim(),

    // Senha é opcional na edição, mas obrigatória na criação (tratamos isso na UI/Action)
    password: z.string()
        .min(6, "A senha deve ter no mínimo 6 caracteres")
        .optional()
        .or(z.literal("")),

    role: z.nativeEnum(Role),

    companyId: z.string().optional(),

    // --- NOVOS CAMPOS ---

    jobTitle: z.string()
        .max(50, "Cargo muito longo")
        .optional()
        .or(z.literal("")), // Permite limpar o campo

    phone: z.string()
        .regex(phoneRegex, "Formato inválido. Use (DD) 99999-9999")
        .optional()
        .or(z.literal("")),

    cpf: z.string()
        .min(11)
        .max(14)
        .optional()
        .or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;