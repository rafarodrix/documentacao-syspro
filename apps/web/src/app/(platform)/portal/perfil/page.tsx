import { requireSession } from "@/lib/auth-helpers";
import { UserProfileSettings } from "@/components/platform/shared/user-profile-settings";
import { trpc } from "@/lib/api/trpc-client";
import type { CurrentUserProfile } from "@dosc-syspro/contracts/user";

export default async function AdminProfilePage() {
  const session = await requireSession();

  let profile: CurrentUserProfile;
  try {
    const result = await trpc.users.getCurrentProfile.query();
    profile = result.data;
  } catch {
    profile = {
      name: session.name || "Usuario",
      email: session.email,
      image: session.image ?? null,
      role: session.role,
      preferences: {
        profile: {
          selectedCompanyId: null,
        },
        tickets: {
          defaultTeamFilter: "all",
        },
      },
      permissions: {
        canEditPersonal: true,
        canEditCompany: false,
      },
      selectedCompanyId: null,
      companies: [],
    };
  }

  return <UserProfileSettings profile={profile} />;
}
