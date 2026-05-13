import Image from 'next/image';

export function NavTitle() {
  return (
    <span className="docs-nav-title inline-flex items-center justify-center">
      <span className="relative h-7 w-24 dark:hidden">
        <Image
          src="/img/logo/logo-escura.png"
          alt="Logo Trilink Software"
          fill
          priority
          className="object-contain object-left"
          sizes="96px"
        />
      </span>
      <span className="relative hidden h-7 w-24 dark:block">
        <Image
          src="/img/logo/logo-clara.png"
          alt="Logo Trilink Software"
          fill
          priority
          className="object-contain object-left"
          sizes="96px"
        />
      </span>
      <span className="sr-only">Trilink Software</span>
    </span>
  );
}
