import type { State as RootState } from "../../bootstrap";
import { createSelector } from "redux-clean-architecture";
import { assert } from "tsafe/assert";
import { compiledDataPrivateToPublic } from "../../ports/CompileData";
import { same } from "evt/tools/inDepth/same";
import { removeDuplicates } from "evt/tools/reducers/removeDuplicates";
import { exclude } from "tsafe/exclude";
import { id } from "tsafe/id";
import { WikidataSoftware } from "../../ports/GetWikidataSoftware";
import { name } from "./state";
import type { Software, Agent, Instance, DeclarationFormData } from "./types";

const sliceState = (state: RootState) => state[name];

const compiledData = createSelector(sliceState, state => state.compiledData);

const cache = createSelector(sliceState, state => state.cache);

const softwares = createSelector(compiledData, cache, (compiledData, cache) => {
    const isCacheRestorable = (() => {
        if (cache === undefined) {
            return false;
        }

        if (
            !same(
                Object.fromEntries(
                    compiledData
                        .map(
                            ({ id, similarWikidataSoftwares }) =>
                                [`${id}`, similarWikidataSoftwares.map(({ wikidataId }) => wikidataId)] as const
                        )
                        .sort(([id1], [id2]) => id1.localeCompare(id2))
                ),
                Object.fromEntries(
                    Object.entries(cache.similarSoftwares)
                        .map(([id, { similarSoftwareWikidataIds }]) => [id, similarSoftwareWikidataIds] as const)
                        .sort(([id1], [id2]) => id1.localeCompare(id2))
                )
            )
        ) {
            return false;
        }

        return true;
    })();

    const similarSoftwarePartition: Software.SimilarSoftware[][] = [];

    return compiledData.map(
        (o): Software => ({
            "logoUrl": o.logoUrl ?? o.wikidataSoftware?.logoUrl ?? o.comptoirDuLibreSoftware?.logoUrl,
            "softwareId": o.id,
            "softwareName": o.name,
            "softwareDescription": o.description,
            "latestVersion": o.latestVersion,
            "testUrl": o.testUrls[0]?.url,
            "addedTime": o.referencedSinceTime,
            "updateTime": o.updateTime,
            "dereferencing": o.dereferencing,
            "categories": o.categories,
            "prerogatives": {
                "doRespectRgaa": o.doRespectRgaa ?? false,
                "isFromFrenchPublicServices": o.isFromFrenchPublicService,
                "isPresentInSupportContract": o.isPresentInSupportContract
            },
            "userAndReferentCountByOrganization": (() => {
                const out: Software["userAndReferentCountByOrganization"] = {};

                o.referents.forEach(referent => {
                    const entry = (out[referent.organization] ??= { "referentCount": 0, "userCount": 0 });
                    entry.referentCount++;
                });
                o.users.forEach(user => {
                    const entry = (out[user.organization] ??= { "referentCount": 0, "userCount": 0 });
                    entry.userCount++;
                });

                return out;
            })(),
            "authors":
                o.wikidataSoftware?.developers.map(developer => ({
                    "authorName": developer.name,
                    "authorUrl": `https://www.wikidata.org/wiki/${developer.id}`
                })) ?? [],
            "officialWebsiteUrl":
                o.wikidataSoftware?.websiteUrl ?? o.comptoirDuLibreSoftware?.external_resources.website,
            "codeRepositoryUrl":
                o.wikidataSoftware?.sourceUrl ?? o.comptoirDuLibreSoftware?.external_resources.repository,
            "versionMin": o.versionMin,
            "license": o.license,
            "comptoirDuLibreServiceProviderCount": o.comptoirDuLibreSoftware?.providers.length ?? 0,
            "annuaireCnllServiceProviders": o.annuaireCnllServiceProviders,
            "comptoirDuLibreId": o.comptoirDuLibreSoftware?.id,
            "wikidataId": o.wikidataSoftware?.wikidataId,
            "softwareType": o.softwareType,
            "parentWikidataSoftware": o.parentWikidataSoftware,
            "similarSoftwares": (() => {
                if (isCacheRestorable) {
                    assert(cache !== undefined);

                    return cache.similarSoftwares[o.id].similarSoftwares;
                }

                const softwareAlreadySeen = new Set<string>();

                for (const similarSoftwares of similarSoftwarePartition) {
                    for (const similarSoftware of similarSoftwares) {
                        if (!similarSoftware.isInSill) {
                            continue;
                        }
                        if (similarSoftware.softwareName === o.name) {
                            return similarSoftwares.filter(item => item !== similarSoftware);
                        }
                        softwareAlreadySeen.add(similarSoftware.softwareName);
                    }
                }

                function wikidataSoftwareToSimilarSoftware(
                    wikidataSoftware: Pick<WikidataSoftware, "wikidataId" | "label" | "description" | "isLibreSoftware">
                ): Software.SimilarSoftware {
                    const software = compiledData.find(
                        o => o.wikidataSoftware?.wikidataId === wikidataSoftware.wikidataId
                    );

                    if (software === undefined) {
                        return {
                            "isInSill": false,
                            "wikidataId": wikidataSoftware.wikidataId,
                            "label": wikidataSoftware.label,
                            "description": wikidataSoftware.description,
                            "isLibreSoftware": wikidataSoftware.isLibreSoftware
                        };
                    }

                    return {
                        "isInSill": true,
                        "softwareName": software.name,
                        "softwareDescription": software.description
                    };
                }

                function recursiveWalk(similarSoftware: Software.SimilarSoftware): Software.SimilarSoftware[] {
                    {
                        const id = similarSoftware.isInSill ? similarSoftware.softwareName : similarSoftware.wikidataId;

                        if (softwareAlreadySeen.has(id)) {
                            return [];
                        }

                        softwareAlreadySeen.add(id);
                    }

                    return id<Software.SimilarSoftware[]>([
                        similarSoftware,
                        ...(() => {
                            if (!similarSoftware.isInSill) {
                                return [];
                            }

                            const software = compiledData.find(o => o.name === similarSoftware.softwareName);

                            assert(software !== undefined);

                            return software.similarWikidataSoftwares
                                .map(wikidataSoftware =>
                                    recursiveWalk(wikidataSoftwareToSimilarSoftware(wikidataSoftware))
                                )
                                .flat();
                        })(),
                        ...compiledData
                            .map(software => {
                                const hasCurrentSimilarSoftwareInItsListOfSimilarSoftware =
                                    software.similarWikidataSoftwares.find(wikidataSoftware => {
                                        const similarSoftware_i = wikidataSoftwareToSimilarSoftware(wikidataSoftware);

                                        if (similarSoftware.isInSill) {
                                            return (
                                                similarSoftware_i.isInSill &&
                                                similarSoftware_i.softwareName === similarSoftware.softwareName
                                            );
                                        } else {
                                            return wikidataSoftware.wikidataId === similarSoftware.wikidataId;
                                        }
                                    }) !== undefined;

                                if (!hasCurrentSimilarSoftwareInItsListOfSimilarSoftware) {
                                    return undefined;
                                }

                                return recursiveWalk({
                                    "isInSill": true,
                                    "softwareName": software.name,
                                    "softwareDescription": software.description
                                });
                            })
                            .filter(exclude(undefined))
                            .flat()
                    ]);
                }

                const similarSoftwares = recursiveWalk(
                    id<Software.SimilarSoftware.Sill>({
                        "isInSill": true,
                        "softwareName": o.name,
                        "softwareDescription": o.description
                    })
                );

                similarSoftwarePartition.push(similarSoftwares);

                return similarSoftwares.filter(
                    similarSoftware => !(similarSoftware.isInSill && similarSoftware.softwareName === o.name)
                );
            })(),
            "keywords": [...o.keywords, ...(o.comptoirDuLibreSoftware?.keywords ?? [])].reduce(
                ...removeDuplicates<string>((k1, k2) => k1.toLowerCase() === k2.toLowerCase())
            )
        })
    );
});

const instances = createSelector(compiledData, (compiledData): Instance[] =>
    compiledData
        .map(software => software.instances.map(instance => ({ ...instance, "mainSoftwareSillId": software.id })))
        .flat()
        .map(
            ({
                id,
                organization,
                targetAudience,
                publicUrl,
                otherWikidataSoftwares,
                addedByAgentEmail,
                mainSoftwareSillId
            }) => ({
                id,
                mainSoftwareSillId,
                organization,
                targetAudience,
                publicUrl,
                otherWikidataSoftwares,
                addedByAgentEmail
            })
        )
);

const agents = createSelector(sliceState, state =>
    state.db.agentRows.map((agentRow): Agent => {
        const getSoftwareName = (softwareId: number) => {
            const row = state.db.softwareRows.find(row => row.id === softwareId);

            assert(row !== undefined);

            return row.name;
        };

        return {
            "email": agentRow.email,
            "declarations": [
                ...state.db.softwareUserRows
                    .filter(row => row.agentEmail === agentRow.email)
                    .map((row): DeclarationFormData.User & { softwareName: string } => ({
                        "declarationType": "user",
                        "usecaseDescription": row.useCaseDescription,
                        "os": row.os,
                        "version": row.version,
                        "serviceUrl": row.serviceUrl,
                        "softwareName": getSoftwareName(row.softwareId)
                    })),
                ...state.db.softwareReferentRows
                    .filter(row => row.agentEmail === agentRow.email)
                    .map((row): DeclarationFormData.Referent & { softwareName: string } => ({
                        "declarationType": "referent",
                        "isTechnicalExpert": row.isExpert,
                        "usecaseDescription": row.useCaseDescription,
                        "serviceUrl": row.serviceUrl,
                        "softwareName": getSoftwareName(row.softwareId)
                    }))
            ],
            "organization": agentRow.organization
        };
    })
);

const aboutAndIsPublicByAgentEmail = createSelector(
    sliceState,
    (state): Record<string, { isPublic: boolean; about: string | undefined } | undefined> =>
        Object.fromEntries(
            state.db.agentRows.map(agentRow => [
                agentRow.email,
                {
                    "isPublic": agentRow.isPublic,
                    "about": agentRow.about
                }
            ])
        )
);

const referentCount = createSelector(
    agents,
    agents =>
        agents
            .filter(
                agent =>
                    agent.declarations.find(declaration => declaration.declarationType === "referent") !== undefined
            )
            .map(agent => agent.email)
            .reduce(...removeDuplicates()).length
);

const compiledDataPublicJson = createSelector(sliceState, state => {
    const { compiledData } = state;

    return JSON.stringify(compiledDataPrivateToPublic(compiledData), null, 2);
});

export const selectors = {
    softwares,
    instances,
    agents,
    referentCount,
    compiledDataPublicJson,
    aboutAndIsPublicByAgentEmail
};
