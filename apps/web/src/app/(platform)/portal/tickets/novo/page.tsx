import { requireSession } from "@/lib/auth-helpers";
import { CreateTicketPageForm } from "@/features/tickets/interface/components/create-ticket-page-form";
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
  const hasInternalTicketAccess = await currentUserHasPermission("tickets:view_all");
  const params = searchParams ? await searchParams : undefined;
  const source = readQueryParam(params?.source).toLowerCase();
  const companyId = readQueryParam(params?.companyId);
  const subject = readQueryParam(params?.subject);
  const description = readQueryParam(params?.description);
  const customerEmail = readQueryParam(params?.customerEmail);
  const customerName = readQueryParam(params?.customerName);
  const customerPhone = readQueryParam(params?.customerPhone);
  const customerWhatsapp = readQueryParam(params?.customerWhatsapp);
  const initialContext =
    source === "chatwoot"
      ? {
          source: "chatwoot" as const,
          chatwootConversationId: readQueryParam(params?.chatwootConversationId),
          chatwootContactId: readQueryParam(params?.chatwootContactId),
          chatwootAccountId: readQueryParam(params?.chatwootAccountId),
          chatwootConversationUrl: readQueryParam(params?.chatwootConversationUrl),
          customerName,
          customerPhone,
          customerWhatsapp,
          customerEmail,
          companyId,
          subject,
          description,
        }
      : companyId || subject || description || customerEmail || customerName || customerPhone || customerWhatsapp
        ? {
            source: "portal" as const,
            customerName,
            customerPhone,
            customerWhatsapp,
            customerEmail,
            companyId,
            subject,
            description,
          }
        : undefined;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CreateTicketPageForm hasInternalTicketAccess={hasInternalTicketAccess} initialContext={initialContext} />
    </div>
  );
}
