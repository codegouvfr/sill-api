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
    comptoirDuLibreOrgId?: number;
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
};

export type Referent = {
    id: number;
    email: string;
    emailAlt?: string;
};

/** Combines Software and Referent, the api.json file is an array of this type */
export type ApiSoftware = {
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
    comptoirDuLibreOrgId: number | null;
    license: string;
    whereAndInWhatContextIsItUsed: string | null;
    catalogNumeriqueGouvFrId: string | null;
    mimGroup: MimGroup;
    versionMin: string;
    versionMax: string | null;
    referent: {
        email: string;
        emailAlt: string | null;
        isReferentExpert: boolean | null;
    } | null;
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
    "Type",
    "Référent : expert technique ?",
] as const;

export type CsvReferentColumn = typeof csvReferentColumns[number];

//export type CsvReferent = Record<CsvReferentColumn, string>;
