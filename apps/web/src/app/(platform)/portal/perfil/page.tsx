import { requireSession } from "@/lib/auth-helpers";
import { UserProfileSettings } from "@/components/platform/shared/user-profile-settings";
import { callWebApi } from "@/lib/web-api";

export default async function AdminProfilePage() {
  const session = await requireSession();
  const response = await callWebApi("/api/users/me/profile").catch(() => null);

  const payload = response ? await response.json().catch(() => null) : null;
  const profile = response?.ok
    ? payload?.data
    : {
        name: session.name || "Usuario",
        email: session.email,
        image: session.image ?? null,
        role: session.role,
        permissions: {
          canEditPersonal: true,
          canEditCompany: false,
        },
        selectedCompanyId: null,
        companies: [],
      };

  return <UserProfileSettings profile={profile} />;
}
