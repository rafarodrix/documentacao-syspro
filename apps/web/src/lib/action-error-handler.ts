import { Prisma } from "@prisma/client";

export type ActionErrorResponse = {
  success: false;
  message: string;
};

/**
 * Handler centralizado para erros em Server Actions.
 * Trata erros conhecidos do Prisma e erros genéricos.
 * Usar em qualquer feature — não duplicar por arquivo.
 */
export function handleActionError(error: unknown): ActionErrorResponse {
  console.error("[Action Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[]) ?? [];
      if (target.includes("email")) {
        return { success: false, message: "Este e-mail já está em uso." };
      }
      if (target.includes("cpf")) {
        return { success: false, message: "Este CPF já está cadastrado." };
      }
      return { success: false, message: "Registro duplicado." };
    }

    if (error.code === "P2025") {
      return { success: false, message: "Registro não encontrado." };
    }
  }

  if (error instanceof Error) {
    return { success: false, message: error.message || "Erro interno no servidor." };
  }

  return { success: false, message: "Erro interno no servidor." };
}