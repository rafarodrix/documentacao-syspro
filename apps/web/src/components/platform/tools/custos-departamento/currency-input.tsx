import React, { useEffect, useState } from 'react';
import { formatCurrency, onlyDigits } from '@dosc-syspro/shared';

interface FormattedCurrencyInputProps {
  value: number;
  onValueChange: (value?: string) => void;
  className?: string;
  id?: string;
}

const parse = (value: string): number => {
  const digits = onlyDigits(value);
  if (!digits) return 0;
  return Number(digits) / 100;
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
