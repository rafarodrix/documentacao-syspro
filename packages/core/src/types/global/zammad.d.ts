interface ZammadChatOptions {
  title?: string;
  fontSize?: string;
  chatId?: number;
  show?: boolean;
  // Adicione outras propriedades que você usa
}

// Agora, estendemos a interface global do Window com a definição CORRETA
declare global {
  interface Window {
    ZammadChat?: new (options: ZammadChatOptions) => {
      open: () => void;
      close: () => void;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
  }
}

export {};