import Image from 'next/image';

export function NavTitle() {
  return (
    <span className="inline-flex items-center gap-2.5">
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
      <span className="hidden text-sm font-medium tracking-tight md:inline">
        Trilink Software
      </span>
    </span>
  );
}
