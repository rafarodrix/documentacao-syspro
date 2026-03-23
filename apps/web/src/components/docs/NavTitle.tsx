import Image from 'next/image';

export function NavTitle() {
  return (
    <>
      <div className="relative h-8 w-32 md:hidden dark:hidden">
        <Image
          src="/logo/logo-escura.png"
          alt="Logo Trilink Software"
          fill
          priority
          className="object-contain object-left"
          sizes="128px"
        />
      </div>
      <div className="relative hidden h-8 w-32 md:hidden dark:block">
        <Image
          src="/logo/logo-clara.png"
          alt="Logo Trilink Software"
          fill
          priority
          className="object-contain object-left"
          sizes="128px"
        />
      </div>
      <span className="hidden md:inline font-semibold">Syspro ERP</span>
    </>
  );
}
