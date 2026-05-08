"use server";

import type { CreateContactInput, UpdateContactInput } from "@dosc-syspro/contracts/contact";
import { trpc } from "@/lib/api/trpc-client";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type { ContactActionResponse } from "@/features/contact/domain/contact.types";

export async function createContactAction(data: CreateContactInput): Promise<ContactActionResponse> {
  try {
    await trpc.contacts.create.mutate(data);
    revalidateCadastrosViews();
    return { success: true, message: "Contato cadastrado com sucesso." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao cadastrar contato.",
    };
  }
}

export async function updateContactAction(id: string, data: UpdateContactInput): Promise<ContactActionResponse> {
  try {
    await trpc.contacts.update.mutate({ id, data });
    revalidateCadastrosViews();
    return { success: true, message: "Contato atualizado com sucesso." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao atualizar contato.",
    };
  }
}

export async function unlinkContactCompaniesAction(id: string): Promise<ContactActionResponse> {
  try {
    await trpc.contacts.update.mutate({ id, data: { companyIds: [] } });
    revalidateCadastrosViews();
    return { success: true, message: "Empresas desvinculadas com sucesso." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Falha ao desvincular.",
    };
  }
}

export async function deleteContactAction(id: string): Promise<ContactActionResponse> {
  try {
    await trpc.contacts.remove.mutate({ id });
    revalidateCadastrosViews();
    return { success: true, message: "Contato removido da lista com sucesso." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Falha ao excluir contato.",
    };
  }
}

export async function syncContactsAction(): Promise<ContactActionResponse<{ message?: string }>> {
  try {
    const payload = await trpc.contacts.sync.mutate({});
    revalidateCadastrosViews();
    return {
      success: true,
      message: (payload as { message?: string })?.message || "Sincronizacao concluida.",
      data: { message: (payload as { message?: string })?.message },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Falha ao sincronizar contatos.",
    };
  }
}
