// Tipo para os dados de uma Release Note
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

// Tipo para os dados de um ticket do usuário
export type UserTicket = {
  id: number;
  number: string;
  title: string;
  status: string;
  lastUpdate: string;
  link: string;
};