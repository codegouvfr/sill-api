import type { Db } from "./DbApi";
import type { WikidataSoftware } from "./GetWikidataSoftware";
import type { ComptoirDuLibre } from "./GetComptoirDuLibre";

export type CompileData = (params: {
    db: Db;
    getCachedSoftware: ((params: { sillSoftwareId: number }) => CompileData.PartialSoftware | undefined) | undefined;
}) => Promise<CompiledData<"private">>;

export namespace CompileData {
    export type PartialSoftware = Pick<
        CompiledData.Software<"private">,
        "wikidataSoftware" | "latestVersion" | "similarWikidataSoftwares" | "parentWikidataSoftware"
    > & {
        comptoirDuLibreSoftware:
            | {
                  id: number;
                  logoUrl: string | undefined;
                  keywords: string[] | undefined;
              }
            | undefined;
        instances: Pick<CompiledData.Instance, "id" | "otherWikidataSoftwares">[];
    };
}

export type CompiledData<T extends "private" | "public"> = CompiledData.Software<T>[];

export namespace CompiledData {
    export type Software<T extends "private" | "public"> = T extends "private" ? Software.Private : Software.Public;
    export namespace Software {
        export type Common = Omit<
            Db.SoftwareRow,
            "wikidataId" | "comptoirDuLibreId" | "similarSoftwareWikidataIds" | "parentSoftwareWikidataId"
        > & {
            wikidataSoftware: WikidataSoftware | undefined;
            similarWikidataSoftwares: Pick<
                WikidataSoftware,
                "wikidataId" | "label" | "description" | "isLibreSoftware"
            >[];
            parentWikidataSoftware: Pick<WikidataSoftware, "wikidataId" | "label" | "description"> | undefined;
            comptoirDuLibreSoftware:
                | (ComptoirDuLibre.Software & { logoUrl: string | undefined; keywords: string[] | undefined })
                | undefined;
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
            users: (Pick<Db.AgentRow, "organization"> &
                Pick<Db.SoftwareUserRow, "os" | "serviceUrl" | "useCaseDescription" | "version">)[];
            referents: (Pick<Db.AgentRow, "email" | "organization"> &
                Pick<Db.SoftwareReferentRow, "isExpert" | "serviceUrl" | "useCaseDescription">)[];
            instances: (Instance & { addedByAgentEmail: string })[];
        };
    }

    export type Instance = {
        id: number;
        organization: string;
        targetAudience: string;
        publicUrl: string | undefined;
        otherWikidataSoftwares: Pick<WikidataSoftware, "wikidataId" | "label" | "description">[];
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
