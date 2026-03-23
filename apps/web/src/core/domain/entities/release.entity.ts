export interface Release {
    id: string;
    type: string;
    isoDate: string;
    title: string;
    summary: string;
    link: string;
    videoLink: string | null;
    tags: string[];
}
