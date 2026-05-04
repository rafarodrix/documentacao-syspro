import Image from 'next/image';

export function NavTitle() {
  return (
    <>
      {/* Mobile: logo com troca de tema; desktop: texto */}
      <div className="md:hidden">
        <div className="relative h-8 w-32 dark:hidden">
          <Image
            src="/img/logo/logo-escura.png"
            alt="Logo Trilink Software"
            fill
            priority
            className="object-contain object-left"
            sizes="128px"
          />
        </div>
        <div className="relative hidden h-8 w-32 dark:block">
          <Image
            src="/img/logo/logo-clara.png"
            alt="Logo Trilink Software"
            fill
            priority
            className="object-contain object-left"
            sizes="128px"
          />
        </div>
      </div>
      <span className="hidden md:inline font-semibold">Syspro ERP</span>
    </>
  );
}
