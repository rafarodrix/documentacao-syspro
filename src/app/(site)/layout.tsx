export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header/Navbar aqui se tiver */}
      <main className="flex-1">
        {children}
      </main>
      {/* Footer aqui se tiver */}
    </div>
  );
}