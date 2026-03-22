import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { DocsSidebarTopControls } from '@/components/docs/DocsSidebarTopControls';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: null,
    children: <DocsSidebarTopControls />,
  },
  themeSwitch: {
    enabled: false,
  },
  searchToggle: {
    // Mantem busca no mobile (topbar), mas desativa a barra de busca grande nativa do desktop.
    components: {
      lg: false,
    },
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
