import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UserProfileSettings } from "@/components/platform/shared/UserProfileSettings";

export default async function AdminProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: {
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  const userData = {
    name: user?.name || session.name || "Usuario",
    email: user?.email || session.email,
    image: user?.image ?? session.image,
    role: user?.role ?? session.role,
    twoFactorEnabled: true,
  };

  return <UserProfileSettings user={userData} />;
}
