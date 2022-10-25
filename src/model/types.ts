import type { LocalizedString as LocalizedString_generic } from "i18nifty/LocalizedString";
import type { PartialNoOptional } from "../tools/PartialNoOptional";

export const languages = ["fr", "en"] as const;

export type Language = typeof languages[number];

export type LocalizedString = LocalizedString_generic<Language>;

// https://git.sr.ht/~etalab/sill
export type SoftwareRow = {
    id: number;
    name: string;
    function: string;
    referencedSinceTime: number;
    dereferencing?: {
        reason?: string;
        time: number;
        lastRecommendedVersion?: string;
    };
    isStillInObservation: boolean;
    parentSoftware?: SoftwareRef;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares?: SoftwareRef[];
    //Should not be optional
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibreId?: number;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    license: string;
    contextOfUse?: string;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    mimGroup: MimGroup;
    versionMin: string;
    workshopUrls: string[];
    testUrls: {
        description: string;
        url: string;
    }[];
    useCaseUrls: string[];
    agentWorkstation: boolean;
    tags?: string[];
    generalInfoMd?: string;
};

export type ReferentRow = {
    email: string;
    familyName: string;
    firstName: string;
    agencyName: string;
};

export type SoftwareReferentRow = {
    softwareId: number;
    referentEmail: string;
    isExpert: boolean;
    useCaseDescription: string;
    isPersonalUse: boolean;
};

export type ServiceRow = ServiceRow.KnownSoftware | ServiceRow.UnknownSoftware;

export namespace ServiceRow {
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
        softwareSillId: number;
    };

    export type UnknownSoftware = Common & {
        softwareSillId?: undefined;
        softwareName: string;
        comptoirDuLibreId?: number;
    };
}

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

export const mimGroups = ["MIMO", "MIMDEV", "MIMPROD", "MIMDEVOPS"] as const;

export type MimGroup = typeof mimGroups[number];

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

export type WikidataData = {
    id: string;
    developers: {
        name: string;
        id: string;
    }[];
} & PartialNoOptional<{
    label: LocalizedString;
    description: LocalizedString;
    logoUrl: string;
    framaLibreId: string;
    websiteUrl: string;
    sourceUrl: string;
    documentationUrl: string;
    license: string;
}>;

export type CompiledData<T extends "with referents" | "without referents" = "without referents"> = {
    catalog: CompiledData.Software<T>[];
    services: CompiledData.Service[];
};

export namespace CompiledData {
    export type Software<T extends "with referents" | "without referents" = "without referents"> =
        T extends "with referents" ? Software.WithReferent : Software.WithoutReferent;
    export namespace Software {
        export type Common = Omit<SoftwareRow, "wikidataId" | "comptoirDuLibreId"> & {
            wikidataData?: WikidataData;
            comptoirDuLibreSoftware: ComptoirDuLibre.Software | undefined;
            annuaireCnllServiceProviders:
                | {
                      name: string;
                      siren: string;
                      url: string;
                  }[]
                | undefined;
        };

        export type WithoutReferent = Common & {
            referentCount: number;
            hasExpertReferent: boolean;
        };

        export type WithReferent = Common & {
            referents: (ReferentRow & {
                isExpert: boolean;
                useCaseDescription: string;
                isPersonalUse: boolean;
            })[];
        };
    }

    export type Service = ServiceRow;
}

export function removeReferent(
    software: CompiledData.Software<"with referents">
): CompiledData.Software<"without referents"> {
    const { referents, ...rest } = software;
    return {
        ...rest,
        "hasExpertReferent": referents.find(({ isExpert }) => isExpert) !== undefined,
        "referentCount": referents.length
    };
}
