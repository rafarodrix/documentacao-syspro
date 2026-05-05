import { FC, ReactNode } from 'react';

// Props que o nosso novo componente aceitará
interface TaxDetailSectionProps {
  title: string;
  icon: ReactNode;
  colorClass: string;
  condition?: boolean;
  children: ReactNode;
}

/**
 * Um componente reutilizável para renderizar uma seção de detalhe de imposto,
 * com borda colorida, ícone e título.
 */
const TaxDetailSection: FC<TaxDetailSectionProps> = ({ title, icon, colorClass, condition = true, children }) => {
  if (!condition) {
    return null;
  }

  return (
    <div className={`border-l-4 ${colorClass} pl-3`}>
      <h4 className={`font-semibold flex items-center gap-1 mb-1 text-foreground/90`}>
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
};