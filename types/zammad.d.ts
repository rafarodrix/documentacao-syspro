// Primeiro, definimos a interface para as opções do chat
interface ZammadChatOptions {
  title: string;
  fontSize: string;
  chatId: number;
  show: boolean;
  // Adicione outras propriedades se a biblioteca Zammad as suportar
}

// Agora, estendemos a interface global do Window
declare global {
  interface Window {
    ZammadChat?: (options: any) => void;
    zammadChat?: {
      open: () => void;
      close: () => void;
    };
  }
}

// Este export vazio é importante para que o arquivo seja tratado como um módulo pelo TypeScript.
export {};