import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UserProfileSettings } from "@/components/platform/shared/UserProfileSettings";

export default async function AdminProfilePage() {
    const session = await getProtectedSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            name: true,
            email: true,
            image: true,
            role: true,
        }
    });

    if (!user) return <div>Usuário não encontrado.</div>;

    const userData = {
        name: user.name || "Admin",
        email: user.email,
        image: user.image,
        role: user.role,
        twoFactorEnabled: true // Admins podem ter isso forçado como true no futuro
    };

    return <UserProfileSettings user={userData} />;
}