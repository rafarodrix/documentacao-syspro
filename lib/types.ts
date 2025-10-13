// Tipo para os dados de uma Release Note (usado na HomePage e páginas de release)
export type Release = {
  id: string;
  type: string;
  isoDate: string;
  title: string;
  summary: string | null;
  link: string;
  videoLink: string | null;
  tags: string[];
};

// Tipo para os dados de um ticket do usuário (usado no Portal do Cliente)
export type UserTicket = {
  id: number;
  number: string;
  title: string;
  status: string;
  lastUpdate: string;
  link: string;
};