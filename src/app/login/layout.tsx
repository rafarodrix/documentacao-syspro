export const metadata = {
  title: 'Login | Portal Syspro', 
  description: 'Acesso seguro à área do cliente.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <div className="flex-1">
      {children}
    </div>
  );
}