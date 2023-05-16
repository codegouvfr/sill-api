import { assert } from "tsafe/assert";
import type { CompileData, CompiledData } from "../ports/CompileData";
import type { GetWikidataSoftware, WikidataSoftware } from "../ports/GetWikidataSoftware";
import type { GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";
import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import type { ComptoirDuLibreApi } from "../ports/GetComptoirDuLibre";

export function createCompileData(params: {
    getWikidataSoftware: GetWikidataSoftware;
    getCnllPrestatairesSill: GetCnllPrestatairesSill;
    comptoirDuLibreApi: ComptoirDuLibreApi;
    getSoftwareLatestVersion: GetSoftwareLatestVersion;
}) {
    const { getWikidataSoftware, comptoirDuLibreApi, getCnllPrestatairesSill, getSoftwareLatestVersion } = params;

    const compileData: CompileData = async params => {
        const {
            db: { softwareRows, agentRows, softwareReferentRows, softwareUserRows, instanceRows },
            cache
        } = params;

        const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] = await Promise.all([
            comptoirDuLibreApi.getComptoirDuLibre(),
            getCnllPrestatairesSill()
        ]);

        const { wikidataSoftwareBySillId, softwareLatestVersionBySillId, comptoirDuLibreLogoUrlBySillId } =
            await (async () => {
                const wikidataSoftwareBySillId: Record<number, WikidataSoftware | undefined> = {};
                const softwareLatestVersionBySillId: Record<
                    number,
                    { semVer: string; publicationTime: number } | undefined
                > = {};
                const comptoirDuLibreLogoUrlBySillId: Record<number, string | undefined> = {};

                {
                    for (const { id: sillId, name, wikidataId, comptoirDuLibreId } of softwareRows) {
                        console.log(`Scrapping the web for info about ${name}`);

                        const cacheEntry = cache[sillId];

                        if (cacheEntry !== undefined) {
                            wikidataSoftwareBySillId[sillId] = cacheEntry.wikidataSoftware;
                            softwareLatestVersionBySillId[sillId] = cacheEntry.latestVersion;
                            comptoirDuLibreLogoUrlBySillId[sillId] = cacheEntry.comptoirDuLibreLogoUrl;
                            continue;
                        }

                        const wikidataSoftware =
                            wikidataId === undefined ? undefined : await getWikidataSoftware({ wikidataId });

                        wikidataSoftwareBySillId[sillId] = wikidataSoftware;
                        softwareLatestVersionBySillId[sillId] =
                            wikidataSoftware?.sourceUrl === undefined
                                ? undefined
                                : await getSoftwareLatestVersion({ "repoUrl": wikidataSoftware.sourceUrl });

                        comptoirDuLibreLogoUrlBySillId[sillId] =
                            comptoirDuLibreId === undefined
                                ? undefined
                                : await comptoirDuLibreApi.getIconUrl({ comptoirDuLibreId });
                    }
                }

                return { wikidataSoftwareBySillId, softwareLatestVersionBySillId, comptoirDuLibreLogoUrlBySillId };
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

                            return agentRow;
                        })(),
                        ...rest
                    })),
                "users": softwareUserRows
                    .filter(({ softwareId }) => softwareId === softwareRow.id)
                    .map(({ agentEmail, softwareId, ...rest }) => ({
                        ...(() => {
                            const agentRow = agentRows.find(({ email }) => email === agentEmail);

                            assert(agentRow !== undefined, `problem with user ${agentEmail}`);

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

                                  const logoUrl = comptoirDuLibreLogoUrlBySillId[sillId];

                                  return { ...cdlSoftware, logoUrl };
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

        return compiledData;
    };

    return { compileData };
}
