import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type RemotePlatformPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readQueryParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function RemotePlatformPage({ searchParams }: RemotePlatformPageProps) {
  await requireSession();
  const canAccess =
    (await currentUserHasPermission("tools:all")) ||
    ((await currentUserHasPermission("tools:basic")) &&
      (await currentUserHasPermission("companies:view", { acceptCompanyScope: true })));
  if (!canAccess) {
    redirect("/portal");
  }
  const tenantScope = await getRemoteTenantScope();
  const directory = await getRemotePlatformDirectory(tenantScope);
  const params = searchParams ? await searchParams : undefined;
  const initialCompanyId = readQueryParam(params?.companyId) || undefined;
  const initialTicketNumber = readQueryParam(params?.ticketNumber) || undefined;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RemotePlatformDirectoryPanel
        directory={directory}
        initialCompanyId={initialCompanyId}
        initialTicketNumber={initialTicketNumber}
      />
    </div>
  );
}
