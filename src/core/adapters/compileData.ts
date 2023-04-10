import { assert } from "tsafe/assert";
import type { CompileData, CompiledData } from "../ports/CompileData";
import type { GetWikidataSoftware, WikidataSoftware } from "../ports/GetWikidataSoftware";
import type { GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";
import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import type { GetComptoirDuLibre } from "../ports/GetComptoirDuLibre";

export function createCompileData(params: {
    getWikidataSoftware: GetWikidataSoftware;
    getComptoirDuLibre: GetComptoirDuLibre;
    getCnllPrestatairesSill: GetCnllPrestatairesSill;
    getSoftwareLatestVersion: GetSoftwareLatestVersion;
}) {
    const { getWikidataSoftware, getComptoirDuLibre, getCnllPrestatairesSill, getSoftwareLatestVersion } = params;

    const compileData: CompileData = async params => {
        const {
            db: { softwareRows, agentRows, softwareReferentRows, softwareUserRows, instanceRows },
            cache
        } = params;

        const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] = await Promise.all([
            getComptoirDuLibre(),
            getCnllPrestatairesSill()
        ]);

        console.log("start compiling");

        const { wikidataSoftwareBySillId, softwareLatestVersionBySillId } = await (async () => {
            const wikidataSoftwareBySillId: Record<number, WikidataSoftware | undefined> = {};
            const softwareLatestVersionBySillId: Record<
                number,
                { semVer: string; publicationTime: number } | undefined
            > = {};

            {
                for (const { id: sillId, wikidataId } of softwareRows) {
                    console.log(sillId);

                    const cacheEntry = cache[sillId];

                    if (cacheEntry !== undefined) {
                        wikidataSoftwareBySillId[sillId] = cacheEntry.wikidataSoftware;
                        softwareLatestVersionBySillId[sillId] = cacheEntry.latestVersion;
                        continue;
                    }

                    const wikidataSoftware =
                        wikidataId === undefined ? undefined : await getWikidataSoftware({ wikidataId });

                    wikidataSoftwareBySillId[sillId] = wikidataSoftware;
                    softwareLatestVersionBySillId[sillId] =
                        wikidataSoftware?.sourceUrl === undefined
                            ? undefined
                            : await getSoftwareLatestVersion({ "repoUrl": wikidataSoftware.sourceUrl });

                    console.log({
                        "sourceUrl": wikidataSoftware?.sourceUrl,
                        "latestVersion": softwareLatestVersionBySillId[sillId]
                    });
                }
            }

            return { wikidataSoftwareBySillId, softwareLatestVersionBySillId };
        })();

        return softwareRows
            .map(softwareRow => ({
                softwareRow,
                "referents": softwareReferentRows
                    .filter(({ softwareId }) => softwareId === softwareRow.id)
                    .map(({ agentEmail, softwareId, ...rest }) => ({
                        ...(() => {
                            const agentRow = agentRows.find(({ email }) => email === agentEmail);

                            assert(agentRow !== undefined);

                            return agentRow;
                        })(),
                        ...rest
                    })),
                "users": softwareUserRows
                    .filter(({ softwareId }) => softwareId === softwareRow.id)
                    .map(({ agentEmail, softwareId, ...rest }) => ({
                        ...(() => {
                            const agentRow = agentRows.find(({ email }) => email === agentEmail);

                            assert(agentRow !== undefined);

                            const { email, ...rest } = agentRow;

                            return rest;
                        })(),
                        ...rest
                    }))
            }))
            .map(
                ({
                    softwareRow: { wikidataId, comptoirDuLibreId, id: sillId, ...rest },
                    referents,
                    users
                }): CompiledData.Software<"private"> => ({
                    ...rest,
                    "id": sillId,
                    "wikidataSoftware": wikidataSoftwareBySillId[sillId],
                    "comptoirDuLibreSoftware":
                        comptoirDuLibreId === undefined
                            ? undefined
                            : (() => {
                                  const cdlSoftware = cdlSoftwares.find(({ id }) => comptoirDuLibreId === id);

                                  assert(
                                      cdlSoftware !== undefined,
                                      `Comptoir du libre id: ${comptoirDuLibreId} does not match any software`
                                  );

                                  return cdlSoftware;
                              })(),
                    "annuaireCnllServiceProviders": cnllPrestatairesSill
                        .find(({ sill_id }) => sill_id === sillId)
                        ?.prestataires.map(({ nom, siren, url }) => ({
                            "name": nom,
                            siren,
                            url
                        })),
                    "latestVersion": softwareLatestVersionBySillId[sillId],
                    referents,
                    users,
                    "instances": instanceRows
                        .filter(row => row.mainSoftwareSillId === sillId)
                        .map(({ mainSoftwareSillId, ...rest }) => rest)
                })
            );
    };

    return { compileData };
}
