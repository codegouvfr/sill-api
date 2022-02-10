// https://git.sr.ht/~etalab/sill
/*
 * All fields with _ will eventually be fetched from wikiData and thus, removed from Software.
 * We will create a bot that automatically puts data into WikiData. See: http://baskauf.blogspot.com/2019/06/putting-data-into-wikidata-using.html
 * An API will gather all the missing infos so that sill.etalab.gouv.fr and code.gouv.fr work with it.
 * All the fields with __ will be deduced from other metadata.
 */
export type Software = {
    //The id should be the one of Wikidata
    _id: number;
    _name: string;
    _function: string;
    //This info could be fetched from git blame.
    __referencedSinceTime: number;
    recommendationStatus: RecommendationStatus;
    parentSoftware?: SoftwareRef;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares: SoftwareRef[];
    //Should not be optional
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibreId?: number;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    _license: string;
    whereAndInWhatContextIsItUsed?: string;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    mimGroup: MimGroup;
    __versionMin: string;
    versionMax?: string;
    referentId: number | undefined;
    isReferentExpert?: true;
    workshopUrl?: string;
    testUrl?: string;
    useCaseUrl?: string;
};

export type Referent = {
    id: number;
    email: string;
    emailAlt?: string;
};

export type Service = Service.KnownSoftware | Service.UnknownSoftware;

export namespace Service {
    export type Common = {
        id: number;
        agencyName: string;
        publicSector: string;
        agencyUrl: string;
        serviceName: string;
        serviceUrl: string;
        description: string;
        //"2018" | "2019" | "2020" | "2021" | "2022";
        publicationDate: string;
        lastUpdateDate: string;
        signupScope: string;
        usageScope: string;
        signupValidationMethod: string;
        contentModerationMethod: string;
    };

    export type KnownSoftware = Common & {
        softwareId: number;
    };

    export type UnknownSoftware = Common & {
        softwareId?: undefined;
        softwareName: string;
        comptoirDuLibreId?: number;
    };
}

export type Api = {
    id: number;
    name: string;
    function: string;
    //"2018" | "2019" | "2020" | "2021" | "2022";
    referencedSinceYear: string;
    recommendationStatus: RecommendationStatus;
    parentSoftware: SoftwareRef | null;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares: SoftwareRef[];
    wikidataId: string | null;
    comptoirDuLibreSoftware: ComptoirDuLibre.Software | null;
    license: string;
    whereAndInWhatContextIsItUsed: string | null;
    catalogNumeriqueGouvFrId: string | null;
    mimGroup: MimGroup;
    versionMin: string;
    versionMax: string | null;
    workshopUrl: string | null;
    testUrl: string | null;
    useCaseUrl: string | null;
    hasReferent: boolean;
    services: Omit<Service.KnownSoftware[], "softwareId">;
}[];

export type ReferentStats = Omit<Referent, "id"> & {
    softwaresCount: number;
    //Always at least one element if array defined
    unknownSoftwares?: string[];
};

export type SoftwareRef = SoftwareRef.Known | SoftwareRef.Unknown;
export namespace SoftwareRef {
    export type Known = {
        isKnown: true;
        softwareId: number;
    };

    export type Unknown = {
        isKnown: false;
        softwareName: string;
    };
}

export const recommendationStatuses = [
    "recommended",
    "in observation",
    "no longer recommended",
] as const;

export type RecommendationStatus = typeof recommendationStatuses[number];

export const mimGroups = ["MIMO", "MIMDEV", "MIMPROD", "MIMDEVOPS"] as const;

export type MimGroup = typeof mimGroups[number];

export const csvSoftwareColumns = [
    "ID",
    "nom",
    "fonction",
    "annees",
    "statut",
    "parent",
    "public",
    "support",
    "similaire-a",
    "wikidata",
    "comptoir-du-libre",
    "licence",
    "contexte-usage",
    "label",
    "fiche",
    "atelier",
    "test",
    "groupe",
    "version_min",
    "version_max",
    "contexte-usage",
] as const;

export type CsvSoftwareColumn = typeof csvSoftwareColumns[number];

//export type CsvSoftware = Record<CsvSoftwareColumn, string>;

export const csvReferentColumns = [
    "Logiciel",
    "Courriel",
    "Courriel 2",
    "Référent : expert technique ?",
] as const;

export type CsvReferentColumn = typeof csvReferentColumns[number];

//export type CsvReferent = Record<CsvReferentColumn, string>;

export const csvServiceColumns = [
    "id",
    "agency_name",
    "public_sector",
    "agency_url",
    "service_name",
    "service_url",
    "description",
    "software_name",
    "software_sill_id",
    "software_comptoir_id",
    "publication_date",
    "last_update_date",
    "signup_scope",
    "usage_scope",
    "signup_validation_method",
    "content_moderation_method",
] as const;

export type CsvServiceColumn = typeof csvServiceColumns[number];

export type ComptoirDuLibre = {
    date_of_export: Date;
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
        created: Date;
        modified: Date;
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
