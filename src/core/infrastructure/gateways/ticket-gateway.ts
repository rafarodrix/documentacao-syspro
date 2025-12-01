import { createTicketAction } from "@/actions/tickets/ticket-actions";
import { TicketFormInput } from "@/core/application/schema/ticket-schema";
import { Result } from "@/core/application/dto/result.dto";

export const ticketGateway = {
    // Especificamos <any> para o Result saber que 'data' pode conter algo
    async create(data: TicketFormInput, files: File[]): Promise<Result<any>> {
        try {
            const formData = new FormData();

            formData.append('subject', data.subject);
            formData.append('description', data.description);
            formData.append('priority', data.priority);
            formData.append('type', data.type);

            files.forEach((file) => {
                formData.append('attachments', file);
            });

            // A Action retorna { success: boolean, data?: any, message?: string }
            const result = await createTicketAction(null, formData);

            if (result.success) {
                // Agora o TypeScript aceita 'result.data'
                return { success: true, data: result.data };
            } else {
                return { success: false, error: result.message };
            }

        } catch (error) {
            console.error(error);
            return { success: false, error: "Erro de comunicação ao criar chamado." };
        }
    }
};