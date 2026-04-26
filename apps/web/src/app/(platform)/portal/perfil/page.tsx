import { requireSession } from "@/lib/auth-helpers";
import { UserProfileSettings } from "@/components/platform/shared/UserProfileSettings";
import { callWebApi } from "@/lib/web-api";

export default async function AdminProfilePage() {
  const session = await requireSession();
  const response = await callWebApi("/api/users/me/profile").catch(() => null);

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
