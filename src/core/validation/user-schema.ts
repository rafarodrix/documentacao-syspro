import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(3, "Nome é obrigatório"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),

    // O Zod vai validar estritamente se o valor é um desses.
    role: z.enum(["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE", "ADMIN", "DEVELOPER"]),

    companyId: z.string().min(1, "Selecione uma empresa"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;