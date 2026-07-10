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
        const error = (() => {
          if (!payload || typeof payload !== "object") return `Falha HTTP ${res.status}`;
          if ("error" in payload && typeof payload.error === "string" && payload.error.trim()) {
            return payload.error.trim();
          }
          if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
            return payload.message.trim();
          }
          if (
            "message" in payload &&
            Array.isArray(payload.message) &&
            payload.message.every((item) => typeof item === "string")
          ) {
            return payload.message.join(", ");
          }
          return `Falha HTTP ${res.status}`;
        })();
        throw new Error(error);
      }

      return adminAtendimentosDataSchema.parse(payload?.data);
    });
}
