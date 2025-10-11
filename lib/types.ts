// Define o tipo Release para representar os dados dos tickets do Zammad
export type Release = {
  id: string;
  type: string;
  isoDate: string;
  title: string;
  link?: string;
  videoLink: string | null;
  tags?: string[];
  summary: string | null; 
};
