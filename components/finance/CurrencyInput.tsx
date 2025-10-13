// src/components/CurrencyInput.tsx

import React, { useState, useEffect } from 'react';

interface FormattedCurrencyInputProps {
  value: number;
  onValueChange: (value?: string) => void;
  className?: string;
  id?: string;
}

// Função para formatar o número como R$
const format = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Função para remover a formatação e obter o número
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
  const [displayValue, setDisplayValue] = useState(format(value));

  useEffect(() => {
    // Atualiza o valor exibido se o 'value' externo mudar
    setDisplayValue(format(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parse(e.target.value);
    setDisplayValue(format(parsedValue));
    
    // Chama a função do pai com o valor numérico em formato de string
    onValueChange(String(parsedValue));
  };

  return <input type="text" {...props} value={displayValue} onChange={handleChange} />;
};