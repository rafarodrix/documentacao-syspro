import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
    name: z.string()
        .min(3, "O nome deve ter no mínimo 3 caracteres")
        .trim(),

    email: z.string()
        .email("Insira um e-mail válido")
        .toLowerCase()
        .trim(),

    password: z.string()
        .min(6, "A senha deve ter no mínimo 6 caracteres"),
    role: z.nativeEnum(Role),

    companyId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;