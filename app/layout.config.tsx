import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { NavTitle } from '@/components/NavTitle';
import { AuthButtons } from '@/components/AuthButtons';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <NavTitle />,
  },
  links: [
    /*{
      text: 'Downloads',
      url: 'https://www.trilink.com.br/public/downloads',
      active: 'nested-url',
    },
    {
      text: 'Links úteis',
      url: 'https://www.trilink.com.br/public/links',
      active: 'nested-url',
    },
    {
      text: 'Área do Cliente',
      url: 'https://www.trilink.com.br/sign-in',
      active: 'nested-url',
    },*/
    {
      // O Fumadocs permite renderizar um componente React diretamente no array de links.
      // Ele será posicionado à direita no cabeçalho.
      type: 'custom',
      children: <AuthButtons />,
    },
  ],
};