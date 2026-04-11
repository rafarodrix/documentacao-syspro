import { Role } from "@prisma/client";
import { requireSession } from "@/lib/auth-helpers";
import { CreateTicketPageForm } from "@/features/tickets/interface/components/CreateTicketPageForm";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

export default async function NovoTicketPage() {
  const session = await requireSession();
  const isSystemUser = SYSTEM_ROLES.includes(session.role);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CreateTicketPageForm isSystemUser={isSystemUser} />
    </div>
  );
}
