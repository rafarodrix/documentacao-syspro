"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface UseSafeMutationOptions<TResult> {
  successMessage?: string | ((result: TResult) => string);
  errorMessage?: string | ((error: any) => string);
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
  onSettled?: () => void | Promise<void>;
  redirect?: string | ((result: TResult) => string);
  refresh?: boolean;
}

export function useSafeMutation<TVariables = void, TResult = any>(
  mutationFn: (variables: TVariables) => Promise<{ success: boolean; message?: string; error?: string; data?: any } & any>,
  options?: UseSafeMutationOptions<TResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const mutate = async (variables: TVariables): Promise<TResult | null> => {
    setIsSubmitting(true);
    try {
      const result = await mutationFn(variables);

      if (!result?.success) {
        const errorMsg = result?.error || result?.message || "Ocorreu um erro ao realizar a ação.";
        const resolvedErrorMsg = typeof options?.errorMessage === "function"
          ? options.errorMessage(result)
          : (options?.errorMessage || errorMsg);

        toast.error(resolvedErrorMsg);
        if (options?.onError) {
          await options.onError(result);
        }
        return null;
      }

      const successMsg = typeof options?.successMessage === "function"
        ? options.successMessage(result)
        : (options?.successMessage || result?.message || "Ação realizada com sucesso.");

      if (successMsg) {
        toast.success(successMsg);
      }

      if (options?.onSuccess) {
        await options.onSuccess(result);
      }

      if (options?.refresh) {
        router.refresh();
      }

      if (options?.redirect) {
        const path = typeof options.redirect === "function"
          ? options.redirect(result)
          : options.redirect;
        router.push(path);
      }

      return result as TResult;
    } catch (error) {
      console.error("Mutation error:", error);
      const errorMsg = typeof options?.errorMessage === "function"
        ? options.errorMessage(error)
        : (options?.errorMessage || "Ocorreu um erro inesperado.");
      toast.error(errorMsg);

      if (options?.onError) {
        await options.onError(error);
      }
      return null;
    } finally {
      setIsSubmitting(false);
      if (options?.onSettled) {
        await options.onSettled();
      }
    }
  };

  return {
    mutate,
    isSubmitting,
  };
}
