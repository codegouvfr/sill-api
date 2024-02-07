import type { Language } from "./GetSoftwareExternalData";

export type GetSoftwareExternalDataOptions = (params: { queryString: string; language: Language }) => Promise<
    {
        id: string;
        label: string;
        description: string;
        isLibreSoftware: boolean;
    }[]
>;
