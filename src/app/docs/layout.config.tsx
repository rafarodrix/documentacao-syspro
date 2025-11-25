import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { NavTitle } from '@/components/docs/NavTitle';

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
  ],
};