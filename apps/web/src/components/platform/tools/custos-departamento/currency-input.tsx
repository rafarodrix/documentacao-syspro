import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/formatters';

interface FormattedCurrencyInputProps {
  value: number;
  onValueChange: (value?: string) => void;
  className?: string;
  id?: string;
}

// Funcao para remover a formatacao e obter o numero
const parse = (value: string): number => {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return 0;
  return Number(digitsOnly) / 100;
};

export const FormattedCurrencyInput = ({
  value,
  onValueChange,
  ...props
}: FormattedCurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));

  useEffect(() => {
    // Atualiza o valor exibido se o `value` externo mudar
    setDisplayValue(formatCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parse(e.target.value);
    setDisplayValue(formatCurrency(parsedValue));

    // Chama a funcao do pai com o valor numerico em formato de string
    onValueChange(String(parsedValue));
  };

  return <input type="text" {...props} value={displayValue} onChange={handleChange} />;
};
