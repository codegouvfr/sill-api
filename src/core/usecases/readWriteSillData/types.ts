import type { WikidataSoftware } from "../../ports/GetWikidataSoftware";

export type ServiceProvider = {
    name: string;
    website?: string;
    cdlUrl?: string;
    cnllUrl?: string;
    siren?: string;
};

export type Software = {
    logoUrl: string | undefined;
    softwareId: number;
    softwareName: string;
    softwareDescription: string;
    serviceProviders: ServiceProvider[];
    latestVersion:
        | {
              semVer: string;
              publicationTime: number;
          }
        | undefined;
    testUrl: string | undefined;
    addedTime: number;
    updateTime: number;
    dereferencing:
        | {
              reason?: string;
              time: number;
              lastRecommendedVersion?: string;
          }
        | undefined;
    categories: string[];
    prerogatives: Prerogatives;
    userAndReferentCountByOrganization: Record<string, { userCount: number; referentCount: number }>;
    authors: {
        authorName: string;
        authorUrl: string;
    }[];
    officialWebsiteUrl: string | undefined;
    codeRepositoryUrl: string | undefined;
    versionMin: string;
    license: string;
    comptoirDuLibreServiceProviderCount: number;
    annuaireCnllServiceProviders:
        | {
              name: string;
              siren: string;
              url: string;
          }[]
        | undefined;
    comptoirDuLibreId: number | undefined;
    wikidataId: string | undefined;
    softwareType: SoftwareType;
    parentWikidataSoftware: Pick<WikidataSoftware, "wikidataId" | "label" | "description"> | undefined;
    similarSoftwares: Software.SimilarSoftware[];
    keywords: string[];
};

export namespace Software {
    export type SimilarSoftware = SimilarSoftware.Wikidata | SimilarSoftware.Sill;

    export namespace SimilarSoftware {
        export type Wikidata = { isInSill: false } & Pick<
            WikidataSoftware,
            "wikidataId" | "label" | "description" | "isLibreSoftware"
        >;

        export type Sill = { isInSill: true; softwareName: string; softwareDescription: string };
    }
}

export type Agent = {
    //NOTE: Undefined if the agent isn't referent of at least one software
    // If it's the user the email is never undefined.
    email: string | undefined;
    organization: string;
    declarations: (DeclarationFormData & { softwareName: string })[];
};

export type Instance = {
    id: number;
    mainSoftwareSillId: number;
    organization: string;
    targetAudience: string;
    publicUrl: string | undefined;
    otherWikidataSoftwares: Pick<WikidataSoftware, "wikidataId" | "label" | "description">[];
};

export type SoftwareType = SoftwareType.Desktop | SoftwareType.CloudNative | SoftwareType.Stack;

export namespace SoftwareType {
    export type Desktop = {
        type: "desktop/mobile";
        os: Record<Os, boolean>;
    };

    export type CloudNative = {
        type: "cloud";
    };

    export type Stack = {
        type: "stack";
    };
}

type Prerogatives = {
    isPresentInSupportContract: boolean;
    isFromFrenchPublicServices: boolean;
    doRespectRgaa: boolean | null;
};
export type Prerogative = keyof Prerogatives;

export type Os = "windows" | "linux" | "mac" | "android" | "ios";

export type SoftwareFormData = {
    softwareType: SoftwareType;
    wikidataId: string | undefined;
    comptoirDuLibreId: number | undefined;
    softwareName: string;
    softwareDescription: string;
    softwareLicense: string;
    softwareMinimalVersion: string;
    isPresentInSupportContract: boolean;
    isFromFrenchPublicService: boolean;
    similarSoftwareWikidataIds: string[];
    softwareLogoUrl: string | undefined;
    softwareKeywords: string[];
    doRespectRgaa: boolean | null;
};

export type DeclarationFormData = DeclarationFormData.User | DeclarationFormData.Referent;

export namespace DeclarationFormData {
    export type User = {
        declarationType: "user";
        usecaseDescription: string;
        /** NOTE: undefined if the software is not of type desktop/mobile */
        os: Os | undefined;
        version: string;
        /** NOTE: Defined only when software is cloud */
        serviceUrl: string | undefined;
    };

    export type Referent = {
        declarationType: "referent";
        isTechnicalExpert: boolean;
        usecaseDescription: string;
        /** NOTE: Can be not undefined only if cloud */
        serviceUrl: string | undefined;
    };
}

export type InstanceFormData = {
    mainSoftwareSillId: number;
    organization: string;
    targetAudience: string;
    publicUrl: string | undefined;
    otherSoftwareWikidataIds: string[];
};
