import { requireSession } from "@/lib/auth-helpers";
import { CreateTicketPageForm } from "@/features/tickets/interface/components/CreateTicketPageForm";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type NovoTicketPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readQueryParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function NovoTicketPage({ searchParams }: NovoTicketPageProps) {
  await requireSession();
  const isSystemUser = await currentUserHasPermission("tickets:view_all");
  const params = searchParams ? await searchParams : undefined;
  const source = readQueryParam(params?.source).toLowerCase();
  const initialContext = source === "chatwoot"
    ? {
        source: "chatwoot",
        chatwootConversationId: readQueryParam(params?.chatwootConversationId),
        chatwootContactId: readQueryParam(params?.chatwootContactId),
        chatwootAccountId: readQueryParam(params?.chatwootAccountId),
        chatwootConversationUrl: readQueryParam(params?.chatwootConversationUrl),
        customerName: readQueryParam(params?.customerName),
        customerPhone: readQueryParam(params?.customerPhone),
        customerWhatsapp: readQueryParam(params?.customerWhatsapp),
        customerEmail: readQueryParam(params?.customerEmail),
        companyId: readQueryParam(params?.companyId),
        subject: readQueryParam(params?.subject),
        description: readQueryParam(params?.description),
      }
    : undefined;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CreateTicketPageForm isSystemUser={isSystemUser} initialContext={initialContext} />
    </div>
  );
}
