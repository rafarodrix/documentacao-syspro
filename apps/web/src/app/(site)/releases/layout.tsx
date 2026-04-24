import { PortalShellLayout } from "@/components/platform/app/layout/PortalShellLayout";

export default function ReleasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PortalShellLayout contentClassName="p-3 sm:p-4 lg:p-6" contentContainerClassName="max-w-7xl">
            <div className="rounded-[28px] border border-border/60 bg-background/95 p-6 shadow-sm sm:p-8">
                {children}
            </div>
        </PortalShellLayout>
    );
}
