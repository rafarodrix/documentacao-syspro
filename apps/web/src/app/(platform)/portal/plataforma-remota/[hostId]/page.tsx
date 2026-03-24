import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemoteHostDetails } from "@/features/remote/application/queries";
import { RemoteHostDetailsPanel } from "@/features/remote/interface/host-details-page";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];

export default async function RemoteHostDetailsPage({
  params,
}: {
  params: Promise<{ hostId: string }>;
}) {
  await requireRole(ALLOWED_ROLES, "/portal");
  const { hostId } = await params;
  const details = await getRemoteHostDetails(hostId);

  if (!details) {
    notFound();
  }

  return <RemoteHostDetailsPanel details={details} />;
}
