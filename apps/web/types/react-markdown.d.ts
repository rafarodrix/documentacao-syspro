declare module "react-markdown" {
  import type { ComponentType, ReactElement } from "react";

  export type MarkdownComponents = Record<string, ComponentType<any>>;

  export interface ReactMarkdownProps {
    children?: string;
    className?: string;
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    components?: MarkdownComponents;
  }

  const ReactMarkdown: (props: ReactMarkdownProps) => ReactElement | null;
  export default ReactMarkdown;
}
