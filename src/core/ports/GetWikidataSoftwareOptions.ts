import type { Language } from "./GetWikidataSoftware";

export type GetWikidataSoftwareOptions = (params: { queryString: string; language: Language }) => Promise<
    {
        id: string;
        label: string;
        description: string;
        isLibreSoftware: boolean;
    }[]
>;
