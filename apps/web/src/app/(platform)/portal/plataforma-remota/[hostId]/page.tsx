import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemoteHostDetails } from "@/features/remote/application/queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemoteHostDetailsPanel } from "@/features/remote/interface/host-details-page";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export default async function RemoteHostDetailsPage({
  params,
}: {
  params: Promise<{ hostId: string }>;
}) {
  await requireSession();
  const canAccess =
    (await currentUserHasPermission("tools:all")) ||
    ((await currentUserHasPermission("tools:basic")) &&
      (await currentUserHasPermission("companies:view", { acceptCompanyScope: true })));
  if (!canAccess) {
    redirect("/portal");
  }
  const { hostId } = await params;
  const tenantScope = await getRemoteTenantScope();
  const details = await getRemoteHostDetails(tenantScope, hostId);

  if (!details) {
    notFound();
  }

  return <RemoteHostDetailsPanel details={details} />;
}
