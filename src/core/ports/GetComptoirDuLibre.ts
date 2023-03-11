export type GetComptoirDuLibre = {
    (): Promise<ComptoirDuLibre>;
    clear: () => void;
};

export type ComptoirDuLibre = {
    date_of_export: string;
    number_of_software: number;
    softwares: ComptoirDuLibre.Software[];
};
export declare namespace ComptoirDuLibre {
    export interface Provider {
        id: number;
        url: string;
        name: string;
        type: string;
        external_resources: {
            website: string;
        };
    }

    export interface User {
        id: number;
        url: string;
        name: string;
        type: string;
        external_resources: {
            website: string;
        };
    }

    export interface Software {
        id: number;
        created: string;
        modified: string;
        url: string;
        name: string;
        licence: string;
        external_resources: {
            website: string;
            repository: string;
        };
        providers: Provider[];
        users: User[];
    }
}
