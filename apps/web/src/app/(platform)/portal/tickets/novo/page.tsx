import { requireSession } from "@/lib/auth-helpers";
import { CreateTicketPageForm } from "@/features/tickets/interface/components/CreateTicketPageForm";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export default async function NovoTicketPage() {
  await requireSession();
  const isSystemUser = await currentUserHasPermission("tickets:view_all");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CreateTicketPageForm isSystemUser={isSystemUser} />
    </div>
  );
}
