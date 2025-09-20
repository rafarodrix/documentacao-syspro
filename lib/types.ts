export type Release = {
  id: string;
  type: string;
  isoDate: string;
  title: string;
  link?: string;
  videoLink: string | null;
  tags?: string[];
};
