import {
  adminAtendimentosDataSchema,
  type AdminAtendimentosData,
} from "@dosc-syspro/contracts/dashboard";

export function getAtendimentosData(params?: {
  from?: string;
  to?: string;
  assigneeId?: string;
  contact?: string;
  refresh?: boolean;
}): Promise<AdminAtendimentosData> {
  const query = new URLSearchParams();
  if (params?.from?.trim()) query.set("from", params.from.trim());
  if (params?.to?.trim()) query.set("to", params.to.trim());
  if (params?.assigneeId?.trim()) query.set("assigneeId", params.assigneeId.trim());
  if (params?.contact?.trim()) query.set("contact", params.contact.trim());
  if (params?.refresh) query.set("refresh", "1");
  const suffix = query.size ? `?${query.toString()}` : "";

  return fetch(`/api/dashboard/suporte/atendimentos${suffix}`, {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (res) => {
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const error =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `Falha HTTP ${res.status}`;
        throw new Error(error);
      }

      return adminAtendimentosDataSchema.parse(payload?.data);
    });
}
