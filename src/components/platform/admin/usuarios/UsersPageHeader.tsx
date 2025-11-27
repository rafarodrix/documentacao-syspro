import { UserSheet } from "@/components/platform/admin/UserSheet";

interface UsersPageHeaderProps {
    companyOptions: { id: string; razaoSocial: string }[];
}

export function UsersPageHeader({ companyOptions }: UsersPageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6">
            <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Usuários
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie acessos, permissões e vínculos empresariais.
                </p>
            </div>

            <div className="flex items-center gap-3">
                {/* O botão de criar novo usuário vive aqui */}
                <UserSheet companies={companyOptions} />
            </div>
        </div>
    );
}