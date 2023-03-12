import type { CompiledData } from "./CompileData";

export type DbApi = {
    fetchCompiledData: () => Promise<CompiledData<"with referents">>;
    fetchDb: () => Promise<Db>;
    updateDb: (params: { newDb: Db; commitMessage: string }) => Promise<void>;
};

export type Db = {
    softwareRows: Db.SoftwareRow[];
    agentRows: Db.AgentRow[];
    softwareReferentRows: Db.SoftwareReferentRow[];
    softwareUserRows: Db.SoftwareUserRow[];
    instanceRows: Db.InstanceRow[];
};

export namespace Db {
    export type SoftwareRow = {
        id: number;
        name: string;
        function: string;
        referencedSinceTime: number;
        updateTime: number;
        dereferencing?: {
            reason?: string;
            time: number;
            lastRecommendedVersion?: string;
        };
        isStillInObservation: boolean;
        parentSoftware?: WikidataEntry;
        doRespectRgaa: boolean;
        isFromFrenchPublicService: boolean;
        isPresentInSupportContract: boolean;
        similarSoftwares: WikidataEntry[];
        wikidataId?: string;
        //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
        /* cspell: disable-next-line */
        comptoirDuLibreId?: number;
        //// https://spdx.org/licenses/
        //// https://www.data.gouv.fr/fr/pages/legal/licences/
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
        categories: string[];
        generalInfoMd?: string;
        addedByAgentEmail: string;
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
        serviceUrl?: string;
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
        id: number;
        mainSoftwareSillId: number;
        organization: string;
        targetAudience: string;
        publicUrl: string;
        otherSoftwares: WikidataEntry[];
    };
}

export type WikidataEntry = {
    wikidataLabel: string;
    wikidataDescription: string;
    wikidataId: string;
};

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
