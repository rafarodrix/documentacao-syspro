export default function PortalReleasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-border/60 bg-background/95 p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}
