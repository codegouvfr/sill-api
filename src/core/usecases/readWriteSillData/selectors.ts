import type { State as RootState } from "../../bootstrap";
import { createSelector } from "redux-clean-architecture";
import { assert } from "tsafe/assert";
import { compiledDataPrivateToPublic } from "../../ports/CompileData";
import { removeDuplicates } from "evt/tools/reducers/removeDuplicates";
import { exclude } from "tsafe/exclude";
import { id } from "tsafe/id";
import { WikidataSoftware } from "../../ports/GetWikidataSoftware";
import { name } from "./state";
import type { Software, Agent, Instance, DeclarationFormData } from "./types";
import { arrDiff } from "evt/tools/reducers/diff";

const sliceState = (state: RootState) => state[name];

const compiledData = createSelector(sliceState, state => state.compiledData);

const cache = createSelector(sliceState, state => state.cache);

const softwares = createSelector(compiledData, cache, (compiledData, cache) => {
    function wikidataSoftwareToSimilarSoftware(
        wikidataSoftware: Pick<WikidataSoftware, "wikidataId" | "label" | "description" | "isLibreSoftware">
    ): Software.SimilarSoftware {
        const software = compiledData.find(o => o.wikidataSoftware?.wikidataId === wikidataSoftware.wikidataId);

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

    const similarSoftwarePartition: Software.SimilarSoftware[][] = cache?.similarSoftwarePartition ?? [];

    increment_partition_using_cache: {
        if (cache === undefined) {
            break increment_partition_using_cache;
        }

        function areSameSimilarSoftwares(a: Software.SimilarSoftware, b: Software.SimilarSoftware): boolean {
            if (a.isInSill) {
                if (!b.isInSill) {
                    return false;
                }
                return a.softwareName === b.softwareName;
            } else {
                if (b.isInSill) {
                    return false;
                }
                return a.wikidataId === b.wikidataId;
            }
        }

        function softwareAdded(software: Software.SimilarSoftware.Sill) {
            if (similarSoftwarePartition.flat().find(entry => areSameSimilarSoftwares(entry, software)) !== undefined) {
                return;
            }

            similarSoftwarePartition.push([software]);
        }

        function softwareRemoved(software: Software.SimilarSoftware.Sill) {
            for (const partition of similarSoftwarePartition) {
                const index = partition.findIndex(entry => areSameSimilarSoftwares(entry, software));

                if (index === -1) {
                    continue;
                }

                partition.splice(index, 1);

                if (partition.length === 0 || partition.every(entry => !entry.isInSill)) {
                    similarSoftwarePartition.splice(similarSoftwarePartition.indexOf(partition), 1);
                }

                return;
            }
        }

        function similarWikidataSoftwareAdded(params: {
            fromSoftware: Software.SimilarSoftware.Sill;
            software: Software.SimilarSoftware;
        }) {
            const { fromSoftware, software } = params;

            for (const partition of similarSoftwarePartition) {
                if (partition.find(entry => areSameSimilarSoftwares(entry, software)) !== undefined) {
                    return;
                }

                if (partition.find(entry => areSameSimilarSoftwares(entry, fromSoftware)) !== undefined) {
                    partition.push(software);
                    return;
                }
            }

            similarSoftwarePartition.push([fromSoftware, software]);

            //TODO: Merge partitions
        }

        function similarWikidataSoftwareRemoved(params: {
            fromSoftware: Software.SimilarSoftware.Sill;
            software: Software.SimilarSoftware;
        }) {
            const { fromSoftware, software } = params;

            for (const partition of similarSoftwarePartition) {
                const index = partition.findIndex(entry => areSameSimilarSoftwares(entry, software));

                if (index === -1) {
                    continue;
                }

                if (
                    partition.filter(entry => entry.isInSill && !areSameSimilarSoftwares(entry, fromSoftware))
                        .length === 0
                ) {
                    partition.splice(index, 1);
                }

                return;
            }
        }

        const { similarSoftwareWikidataIdsBySillId } = cache;

        compiledData.forEach(software => {
            const similarSoftwareWikidataIds_cached = similarSoftwareWikidataIdsBySillId[software.id];

            if (similarSoftwareWikidataIds_cached === undefined) {
                softwareAdded({
                    "isInSill": true,
                    "softwareName": software.name,
                    "softwareDescription": software.description
                });

                return;
            }

            const { added, removed } = arrDiff(
                similarSoftwareWikidataIds_cached,
                software.similarWikidataSoftwares.map(({ wikidataId }) => wikidataId)
            );

            added.forEach(wikidataId => {
                const similarWikidataSoftware = software.similarWikidataSoftwares.find(
                    e => e.wikidataId === wikidataId
                );

                assert(similarWikidataSoftware !== undefined);

                similarWikidataSoftwareAdded({
                    "fromSoftware": {
                        "isInSill": true,
                        "softwareDescription": software.description,
                        "softwareName": software.name
                    },
                    "software": wikidataSoftwareToSimilarSoftware(similarWikidataSoftware)
                });
            });

            removed.forEach(wikidataId => {
                similarWikidataSoftwareRemoved({
                    "fromSoftware": {
                        "isInSill": true,
                        "softwareDescription": software.description,
                        "softwareName": software.name
                    },
                    "software": {}
                });
            });
        });

        Object.keys(similarSoftwareWikidataIdsBySillId).forEach(sillId => {
            //TODO: Create a set to avoid this O(n) complexity
            if (compiledData.find(software => software.id === Number(sillId)) !== undefined) {
                return;
            }

            softwareRemoved({
                "isInSill": true
            });
        });
    }

    const softwares = compiledData.map(
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
                const softwareAlreadySeen = new Set<string>();

                for (const partition of similarSoftwarePartition) {
                    for (const similarSoftware of partition) {
                        if (!similarSoftware.isInSill) {
                            continue;
                        }
                        if (similarSoftware.softwareName === o.name) {
                            return partition.filter(item => item !== similarSoftware);
                        }
                        softwareAlreadySeen.add(similarSoftware.softwareName);
                    }
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

    return { softwares, similarSoftwarePartition };
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
