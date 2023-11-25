import { assert } from "tsafe/assert";
import type { CompileData, CompiledData } from "../ports/CompileData";
import type { GetWikidataSoftware, WikidataSoftware } from "../ports/GetWikidataSoftware";
import type { GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";
import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import type { ComptoirDuLibreApi, ComptoirDuLibre } from "../ports/ComptoirDuLibreApi";
import { exclude } from "tsafe/exclude";
import memoize from "memoizee";

export function createCompileData(params: {
    getWikidataSoftware: GetWikidataSoftware;
    getCnllPrestatairesSill: GetCnllPrestatairesSill;
    comptoirDuLibreApi: ComptoirDuLibreApi;
    getSoftwareLatestVersion: GetSoftwareLatestVersion;
}) {
    const {
        getWikidataSoftware: getWikidataSoftware_params,
        comptoirDuLibreApi,
        getCnllPrestatairesSill,
        getSoftwareLatestVersion
    } = params;

    const compileData: CompileData = async params => {
        let {
            db: { softwareRows, agentRows, softwareReferentRows, softwareUserRows, instanceRows },
            getCachedSoftware
        } = params;

        const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] = await Promise.all([
            comptoirDuLibreApi.getComptoirDuLibre(),
            getCnllPrestatairesSill()
        ]);

        const { partialSoftwareBySillId } = await (async () => {
            const partialSoftwareBySillId: Record<number, CompileData.PartialSoftware> = {};

            const getWikidataSoftware = memoize(
                async (wikidataId: string) => {
                    getWikidataSoftware_params.clear(wikidataId);
                    return await getWikidataSoftware_params(wikidataId);
                },
                { "promise": true }
            );

            for (const {
                id: sillId,
                name,
                wikidataId,
                comptoirDuLibreId,
                parentSoftwareWikidataId,
                similarSoftwareWikidataIds
            } of softwareRows) {
                const cache = getCachedSoftware?.({ "sillSoftwareId": sillId });

                if (cache === undefined) {
                    console.log(`Scrapping the web for info about ${name}`);
                }

                const wikidataSoftware_prev = cache?.wikidataSoftware;

                const wikidataSoftware =
                    wikidataId === undefined
                        ? undefined
                        : cache?.wikidataSoftware?.wikidataId === wikidataId
                        ? cache.wikidataSoftware
                        : await getWikidataSoftware(wikidataId);

                const cdlSoftware_prev = cdlSoftwares.find(({ id }) => cache?.comptoirDuLibreSoftware?.id === id);

                const cdlSoftware = cdlSoftwares.find(({ id }) => comptoirDuLibreId === id);

                const [
                    latestVersion,
                    comptoirDuLibreLogoUrl,
                    comptoirDuLibreKeywords,
                    parentWikidataSoftware,
                    similarWikidataSoftwares,
                    instances
                ] = await Promise.all([
                    (async () => {
                        const getRepoUrl = (
                            wikidataSoftware: WikidataSoftware | undefined,
                            cdlSoftware: ComptoirDuLibre.Software | undefined
                        ) => wikidataSoftware?.sourceUrl ?? cdlSoftware?.external_resources?.repository;

                        const repoUrl_prev = getRepoUrl(wikidataSoftware_prev, cdlSoftware_prev);
                        const repoUrl = getRepoUrl(wikidataSoftware, cdlSoftware);

                        if (repoUrl_prev === repoUrl) {
                            return cache?.latestVersion;
                        }

                        if (repoUrl === undefined) {
                            return undefined;
                        }

                        return getSoftwareLatestVersion({ repoUrl });
                    })(),
                    (() => {
                        if (cdlSoftware_prev?.id === cdlSoftware?.id) {
                            return cache?.comptoirDuLibreSoftware?.logoUrl;
                        }

                        if (cdlSoftware === undefined) {
                            return undefined;
                        }

                        return comptoirDuLibreApi.getIconUrl({ "comptoirDuLibreId": cdlSoftware.id });
                    })(),
                    (() => {
                        if (cdlSoftware_prev?.id === cdlSoftware?.id) {
                            return cache?.comptoirDuLibreSoftware?.keywords;
                        }

                        if (cdlSoftware === undefined) {
                            return undefined;
                        }

                        return comptoirDuLibreApi.getKeywords({ "comptoirDuLibreId": cdlSoftware.id });
                    })(),
                    (async () => {
                        if (cache?.parentWikidataSoftware?.wikidataId === parentSoftwareWikidataId) {
                            return cache?.parentWikidataSoftware;
                        }

                        if (parentSoftwareWikidataId === undefined) {
                            return undefined;
                        }

                        const parentWikidataSoftware = await getWikidataSoftware(parentSoftwareWikidataId);

                        if (parentWikidataSoftware === undefined) {
                            return undefined;
                        }

                        return {
                            "wikidataId": parentWikidataSoftware.wikidataId,
                            "label": parentWikidataSoftware.label,
                            "description": parentWikidataSoftware.description
                        };
                    })(),
                    Promise.all(
                        similarSoftwareWikidataIds.map(async wikidataId => {
                            {
                                const similarSoftware_cache = cache?.similarWikidataSoftwares?.find(
                                    similarSoftware => similarSoftware.wikidataId === wikidataId
                                );

                                if (similarSoftware_cache !== undefined) {
                                    return similarSoftware_cache;
                                }
                            }

                            const wikidataSoftware = await getWikidataSoftware(wikidataId);

                            if (wikidataSoftware === undefined) {
                                return undefined;
                            }

                            return {
                                "wikidataId": wikidataSoftware.wikidataId,
                                "label": wikidataSoftware.label,
                                "description": wikidataSoftware.description,
                                "isLibreSoftware": wikidataSoftware.isLibreSoftware
                            };
                        })
                    ).then(similarWikidataSoftwares => similarWikidataSoftwares.filter(exclude(undefined))),
                    Promise.all(
                        instanceRows
                            .filter(({ mainSoftwareSillId }) => mainSoftwareSillId === sillId)
                            .map(async ({ id, otherSoftwareWikidataIds }) => {
                                const instance_cache = cache?.instances.find(instance => instance.id === id);

                                return {
                                    "id": id,
                                    "otherWikidataSoftwares": await Promise.all(
                                        otherSoftwareWikidataIds.map(async wikidataId => {
                                            const otherWikidataSoftware_cache =
                                                instance_cache?.otherWikidataSoftwares.find(
                                                    wikidataSoftware => wikidataSoftware.wikidataId === wikidataId
                                                );

                                            if (otherWikidataSoftware_cache !== undefined) {
                                                return otherWikidataSoftware_cache;
                                            }

                                            const wikidataSoftware = await getWikidataSoftware(wikidataId);

                                            if (wikidataSoftware === undefined) {
                                                return undefined;
                                            }

                                            return {
                                                "wikidataId": wikidataSoftware.wikidataId,
                                                "label": wikidataSoftware.label,
                                                "description": wikidataSoftware.description
                                            };
                                        })
                                    ).then(otherWikidataSoftwares => otherWikidataSoftwares.filter(exclude(undefined)))
                                };
                            })
                    )
                ] as const);

                partialSoftwareBySillId[sillId] = {
                    wikidataSoftware,
                    latestVersion,
                    comptoirDuLibreSoftware:
                        cdlSoftware === undefined
                            ? undefined
                            : {
                                  "id": cdlSoftware.id,
                                  "logoUrl": comptoirDuLibreLogoUrl,
                                  "keywords": comptoirDuLibreKeywords
                              },
                    parentWikidataSoftware,
                    similarWikidataSoftwares,
                    instances
                };
            }
            return { partialSoftwareBySillId };
        })();

        const compiledData = softwareRows
            .map(softwareRow => ({
                softwareRow,
                "referents": softwareReferentRows
                    .filter(({ softwareId }) => softwareId === softwareRow.id)
                    .map(({ agentEmail, softwareId, ...rest }) => ({
                        ...(() => {
                            const agentRow = agentRows.find(({ email }) => email === agentEmail);

                            assert(agentRow !== undefined, `problem with referent ${agentEmail}`);

                            return {
                                "email": agentRow.email,
                                "organization": agentRow.organization
                            };
                        })(),
                        "isExpert": rest.isExpert,
                        "serviceUrl": rest.serviceUrl,
                        "useCaseDescription": rest.useCaseDescription
                    })),
                "users": softwareUserRows
                    .filter(({ softwareId }) => softwareId === softwareRow.id)
                    .map(({ agentEmail, softwareId, ...rest }) => ({
                        ...(() => {
                            const agentRow = agentRows.find(({ email }) => email === agentEmail);

                            assert(agentRow !== undefined, `problem with user ${agentEmail}`);

                            return {
                                "organization": agentRow.organization
                            };
                        })(),
                        "os": rest.os,
                        "serviceUrl": rest.serviceUrl,
                        "useCaseDescription": rest.useCaseDescription,
                        "version": rest.version
                    }))
            }))
            .map(
                ({
                    softwareRow: {
                        id: sillId,
                        name,
                        description,
                        referencedSinceTime,
                        updateTime,
                        dereferencing,
                        isStillInObservation,
                        doRespectRgaa,
                        isFromFrenchPublicService,
                        isPresentInSupportContract,
                        comptoirDuLibreId,
                        license,
                        softwareType,
                        catalogNumeriqueGouvFrId,
                        versionMin,
                        workshopUrls,
                        testUrls,
                        categories,
                        generalInfoMd,
                        addedByAgentEmail,
                        logoUrl,
                        keywords
                    },
                    referents,
                    users
                }): CompiledData.Software<"private"> => ({
                    "id": sillId,
                    name,
                    description,
                    referencedSinceTime,
                    updateTime,
                    dereferencing,
                    isStillInObservation,
                    doRespectRgaa,
                    isFromFrenchPublicService,
                    isPresentInSupportContract,
                    license,
                    softwareType,
                    catalogNumeriqueGouvFrId,
                    versionMin,
                    workshopUrls,
                    testUrls,
                    categories,
                    generalInfoMd,
                    addedByAgentEmail,
                    logoUrl,
                    keywords,
                    "wikidataSoftware": partialSoftwareBySillId[sillId].wikidataSoftware,
                    "similarWikidataSoftwares": partialSoftwareBySillId[sillId].similarWikidataSoftwares,
                    "parentWikidataSoftware": partialSoftwareBySillId[sillId].parentWikidataSoftware,
                    "comptoirDuLibreSoftware":
                        comptoirDuLibreId === undefined
                            ? undefined
                            : (() => {
                                  const cdlSoftware = cdlSoftwares.find(({ id }) => comptoirDuLibreId === id);

                                  if (cdlSoftware === undefined) {
                                      console.log(
                                          [
                                              `Comptoir du libre id: ${comptoirDuLibreId} does not match any software`,
                                              `it might mean that the software has been recently added to comptoir du libre`,
                                              `an their API is not yet up to date, ignoring`
                                          ].join(" ")
                                      );

                                      return undefined;
                                  }

                                  const logoUrl = partialSoftwareBySillId[sillId].comptoirDuLibreSoftware?.logoUrl;
                                  const keywords = partialSoftwareBySillId[sillId].comptoirDuLibreSoftware?.keywords;

                                  return { ...cdlSoftware, logoUrl, keywords };
                              })(),
                    "annuaireCnllServiceProviders": cnllPrestatairesSill
                        .find(({ sill_id }) => sill_id === sillId)
                        ?.prestataires.map(({ nom, siren, url }) => ({
                            "name": nom,
                            siren,
                            url
                        })),
                    "latestVersion": partialSoftwareBySillId[sillId].latestVersion,
                    users,
                    referents,
                    "instances": instanceRows
                        .filter(row => row.mainSoftwareSillId === sillId)
                        .map(({ id: instanceId, organization, targetAudience, publicUrl, addedByAgentEmail }) => ({
                            "id": instanceId,
                            organization,
                            targetAudience,
                            publicUrl,
                            "otherWikidataSoftwares": (() => {
                                const instance = partialSoftwareBySillId[sillId].instances.find(
                                    ({ id }) => id === instanceId
                                );

                                assert(instance !== undefined);

                                return instance.otherWikidataSoftwares;
                            })(),
                            addedByAgentEmail
                        }))
                })
            );

        return compiledData;
    };

    return { compileData };
}
