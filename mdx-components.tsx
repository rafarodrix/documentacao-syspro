import { Cards } from 'fumadocs-ui/components/card';
import { CustomCard } from '@/components/CustomCard';

export const components = {
  Cards,
  Card: CustomCard, // Substitui o Card nativo pelo personalizado
};

export default components;