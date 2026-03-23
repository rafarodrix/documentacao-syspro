/**
 * Padrão genérico de resposta para toda a aplicação.
 * T = Tipo do dado de sucesso (opcional, padrão void)
 */
export type Result<T = void> = {
    success: boolean;
    data?: T;
    error?: string;
}