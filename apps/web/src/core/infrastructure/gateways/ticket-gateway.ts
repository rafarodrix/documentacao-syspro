import { createTicketAction } from "@/features/tickets/application/actions";
import { TicketFormInput } from "@dosc-syspro/contracts";

type GatewayResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export const ticketGateway = {
  async create(data: TicketFormInput, files: File[]): Promise<GatewayResult<any>> {
    try {
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
        return { success: true, data: result.data };
      }

      return { success: false, error: result.message };
    } catch (error) {
      console.error(error);
      return { success: false, error: "Erro de comunicacao ao criar chamado." };
    }
  },
};
