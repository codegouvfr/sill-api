import { assert } from "tsafe/assert";
import { exclude } from "tsafe/exclude";
import type { CompileData, CompiledData } from "../ports/CompileData";
import type { GetWikidataSoftware, WikidataSoftware } from "../ports/GetWikidataSoftware";
import type { GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";
import type { GetComptoirDuLibre } from "../ports/GetComptoirDuLibre";

export function createCompileData(params: {
    getWikidataSoftware: GetWikidataSoftware;
    getComptoirDuLibre: GetComptoirDuLibre;
    getCnllPrestatairesSill: GetCnllPrestatairesSill;
}) {
    const { getWikidataSoftware, getComptoirDuLibre, getCnllPrestatairesSill } = params;

    const compileData: CompileData = async params => {
        const {
            db: { softwareRows, agentRows, softwareReferentRows, softwareUserRows, instanceRows },
            wikidataCacheCache,
            log = () => {
                /*nothing*/
            }
        } = params;

        const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] = await Promise.all([
            getComptoirDuLibre(),
            getCnllPrestatairesSill()
        ]);

        const wikidataSoftwareById: Record<string, WikidataSoftware | undefined> = {};

        {
            const wikidataIds = softwareRows.map(({ wikidataId }) => wikidataId).filter(exclude(undefined));

            for (let i = 0; i < wikidataIds.length; i++) {
                const wikidataId = wikidataIds[i];

                log(`Fetching WikiData entry ${wikidataId} (${i + 1}/${wikidataIds.length})`);

                wikidataSoftwareById[wikidataId] =
                    wikidataCacheCache?.find(({ wikidataData }) => wikidataData?.id === wikidataId)?.wikidataData ??
                    (await getWikidataSoftware({ wikidataId }));
            }
        }

        const catalog = softwareRows
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
                    softwareRow: { wikidataId, comptoirDuLibreId, ...rest },
                    referents,
                    users
                }): CompiledData.Software<"private"> => ({
                    ...rest,
                    "wikidataData": wikidataId === undefined ? undefined : wikidataSoftwareById[wikidataId],
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
                        .find(({ sill_id }) => sill_id === rest.id)
                        ?.prestataires.map(({ nom, siren, url }) => ({
                            "name": nom,
                            siren,
                            url
                        })),
                    referents,
                    users
                })
            );

        return {
            catalog,
            "services": instanceRows
        };
    };

    return compileData;
}
