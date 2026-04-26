import { requireSession } from "@/lib/auth-helpers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import { UserProfileSettings } from "@/components/platform/shared/UserProfileSettings";
import { headers } from "next/headers";

export default async function AdminProfilePage() {
  const session = await requireSession();
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  const response = await fetch(`${getBackendApiBaseUrl()}/users/me/profile`, {
    headers: withInternalApiHeaders({
      ...(cookie ? { cookie } : {}),
    }),
    cache: "no-store",
  }).catch(() => null);

  const payload = response ? await response.json().catch(() => null) : null;
  const user = response?.ok ? payload?.data : null;

  const userData = {
    name: user?.name || session.name || "Usuario",
    email: user?.email || session.email,
    image: user?.image ?? session.image,
    role: user?.role ?? session.role,
    twoFactorEnabled: true,
  };

  return <UserProfileSettings user={userData} />;
}
