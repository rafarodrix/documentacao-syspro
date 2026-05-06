import { SefazOperationsPanel } from "@/components/sefaz/sefaz-operations-panel";
import { callWebApi } from "@/lib/web-api";

export async function SefazTab({ canViewAvailability }: { canViewAvailability: boolean }) {
  const res = await callWebApi("/api/dashboard/sefaz");
  const body = await res.json().catch(() => null);
  const sefazData = body?.data;

  return (
    <SefazOperationsPanel
      focusUfs={sefazData?.focusUfs ?? []}
      scopedStatuses={sefazData?.sefazStatuses ?? []}
      nationalStatuses={sefazData?.sefazNationalStatuses ?? []}
      configuredRoutes={sefazData?.sefazConfiguredRoutes ?? []}
      canViewAvailability={canViewAvailability}
    />
  );
}
