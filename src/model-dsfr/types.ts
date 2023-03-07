import type { LocalizedString as LocalizedString_generic } from "i18nifty/LocalizedString";
import type { PartialNoOptional } from "../tools/PartialNoOptional";

export const languages = ["fr", "en"] as const;

export type Language = (typeof languages)[number];

export type LocalizedString = LocalizedString_generic<Language>;

export type Os = "windows" | "linux" | "mac";

export type SoftwareType = SoftwareType.Desktop | SoftwareType.CloudNative | SoftwareType.Stack;

export namespace SoftwareType {
    export type Desktop = {
        type: "desktop";
        os: Record<Os, boolean>;
    };

    export type CloudNative = {
        type: "cloud";
    };

    export type Stack = {
        type: "stack";
    };
}

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
    parentSoftware?: WikidataEntry;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    similarSoftwares: WikidataEntry[];
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibreId?: number;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    license: string;
    softwareType: SoftwareType;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    versionMin: string;
    workshopUrls: string[];
    testUrls: {
        description: string;
        url: string;
    }[];
    agentWorkstation: boolean;
    categories: string[];
    generalInfoMd?: string;
};

export type AgentRow = {
    email: string;
    organization: string;
};

export type SoftwareReferentRow = {
    softwareId: number;
    agentEmail: string;
    isExpert: boolean;
    useCaseDescription: string;
    /** NOTE: Can be not undefined only if cloud */
    serviceUrl: string | undefined;
};

export type SoftwareUserRow = {
    softwareId: number;
    agentEmail: string;
    useCaseDescription: string;
    os: Os | undefined;
    version: string;
    /** NOTE: Can be not undefined only if cloud */
    serviceUrl: string | undefined;
};

export type InstanceRow = {
    instanceId: number;
    mainSoftwareSillId: number;
    organization: string;
    targetAudience: string;
    publicUrl: string;
    otherSoftwares: WikidataEntry[];
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

export type WikidataEntry = {
    wikidataLabel: string;
    wikidataDescription: string;
    wikidataId: string;
};

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
            userAndReferentCountByOrganization: Record<string, { userCount: number; referentCount: number }>;
            hasExpertReferent: boolean;
        };

        export type WithReferent = Common & {
            users: (Omit<AgentRow, "email"> & Omit<SoftwareUserRow, "softwareId" | "agentEmail">)[];
            referents: (AgentRow & Omit<SoftwareReferentRow, "softwareId" | "agentEmail">)[];
        };
    }

    export type Service = InstanceRow;
}

export function removeReferent(
    software: CompiledData.Software<"with referents">
): CompiledData.Software<"without referents"> {
    const { referents, users, ...rest } = software;
    return {
        ...rest,
        "hasExpertReferent": referents.find(({ isExpert }) => isExpert) !== undefined,
        "userAndReferentCountByOrganization": (() => {
            const out: CompiledData.Software.WithoutReferent["userAndReferentCountByOrganization"] = {};

            referents.forEach(referent => {
                const entry = (out[referent.organization] ??= { "referentCount": 0, "userCount": 0 });
                entry.referentCount++;
            });
            users.forEach(user => {
                const entry = (out[user.organization] ??= { "referentCount": 0, "userCount": 0 });
                entry.userCount++;
            });

            return out;
        })()
    };
}
