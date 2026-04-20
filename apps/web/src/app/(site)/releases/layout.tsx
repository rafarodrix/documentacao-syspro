import { StaticSiteHeader } from "@/components/site/StaticHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function ReleasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <StaticSiteHeader />

            <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
            </div>

            <main className="container mx-auto max-w-5xl flex-1 px-4 py-12 md:px-6">
                {children}
            </main>

            <SiteFooter />
        </div>
    );
}
