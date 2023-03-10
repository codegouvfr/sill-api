import type { Db } from "./DbApi";
import type { WikidataSoftware } from "./GetWikidataSoftware";
import type { ComptoirDuLibre } from "./GetComptoirDuLibre";

export type CompileData = (params: {
    db: Db;
    //NOTE: CompiledData["catalog"] is assignable to this
    wikidataCacheCache:
        | {
              wikidataData?: WikidataSoftware;
          }[]
        | undefined;
    log?: typeof console.log;
}) => Promise<CompiledData<"private">>;

export type CompiledData<T extends "private" | "public" = "public"> = {
    catalog: CompiledData.Software<T>[];
    services: CompiledData.Service[];
};

export namespace CompiledData {
    export type Software<T extends "private" | "public" = "public"> = T extends "private"
        ? Software.WithReferent
        : Software.WithoutReferent;
    export namespace Software {
        export type Common = Omit<Db.SoftwareRow, "wikidataId" | "comptoirDuLibreId"> & {
            wikidataData?: WikidataSoftware;
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
            users: (Omit<Db.AgentRow, "email"> & Omit<Db.SoftwareUserRow, "softwareId" | "agentEmail">)[];
            referents: (Db.AgentRow & Omit<Db.SoftwareReferentRow, "softwareId" | "agentEmail">)[];
        };
    }

    export type Service = Db.InstanceRow;
}

export function compiledDataPrivateToPublic(compiledData: CompiledData<"private">): CompiledData<"public"> {
    return {
        ...compiledData,
        "catalog": compiledData.catalog.map((software): CompiledData.Software<"public"> => {
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
        })
    };
}
