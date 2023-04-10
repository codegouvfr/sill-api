import type { Db, WikidataEntry } from "./DbApi";
import type { WikidataSoftware } from "./GetWikidataSoftware";
import type { ComptoirDuLibre } from "./GetComptoirDuLibre";

export type CompileData = (params: {
    db: Db;
    cache: Record<
        number /** softwareSillId */,
        {
            wikidataSoftware: WikidataSoftware | undefined;
            latestVersion: { semVer: string; publicationTime: number } | undefined;
        }
    >;
    log?: typeof console.log;
}) => Promise<CompiledData<"private">>;

export type CompiledData<T extends "private" | "public"> = CompiledData.Software<T>[];

export namespace CompiledData {
    export type Software<T extends "private" | "public"> = T extends "private" ? Software.Private : Software.Public;
    export namespace Software {
        export type Common = Omit<Db.SoftwareRow, "wikidataId" | "comptoirDuLibreId"> & {
            wikidataSoftware: WikidataSoftware | undefined;
            comptoirDuLibreSoftware: ComptoirDuLibre.Software | undefined;
            annuaireCnllServiceProviders:
                | {
                      name: string;
                      siren: string;
                      url: string;
                  }[]
                | undefined;
            latestVersion:
                | {
                      semVer: string;
                      publicationTime: number;
                  }
                | undefined;
        };

        export type Public = Common & {
            userAndReferentCountByOrganization: Record<string, { userCount: number; referentCount: number }>;
            hasExpertReferent: boolean;
            instances: Instance[];
        };

        export type Private = Common & {
            users: (Omit<Db.AgentRow, "email"> & Omit<Db.SoftwareUserRow, "softwareId" | "agentEmail">)[];
            referents: (Db.AgentRow & Omit<Db.SoftwareReferentRow, "softwareId" | "agentEmail">)[];
            instances: (Instance & { addedByAgentEmail: string })[];
        };
    }

    export type Instance = {
        id: number;
        organization: string;
        targetAudience: string;
        publicUrl: string | undefined;
        otherSoftwares: WikidataEntry[];
    };
}

export function compiledDataPrivateToPublic(compiledData: CompiledData<"private">): CompiledData<"public"> {
    return compiledData.map((software): CompiledData.Software<"public"> => {
        const { referents, users, instances, ...rest } = software;

        return {
            ...rest,
            "hasExpertReferent": referents.find(({ isExpert }) => isExpert) !== undefined,
            "userAndReferentCountByOrganization": (() => {
                const out: CompiledData.Software.Public["userAndReferentCountByOrganization"] = {};

                referents.forEach(referent => {
                    const entry = (out[referent.organization] ??= { "referentCount": 0, "userCount": 0 });
                    entry.referentCount++;
                });
                users.forEach(user => {
                    const entry = (out[user.organization] ??= { "referentCount": 0, "userCount": 0 });
                    entry.userCount++;
                });

                return out;
            })(),
            "instances": instances.map(({ addedByAgentEmail, ...rest }) => rest)
        };
    });
}
