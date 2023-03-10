import { assert } from "tsafe/assert";
import { exclude } from "tsafe/exclude";
import { fetchWikiDataData } from "./fetchWikiDataData";
import { fetchComptoirDuLibre } from "./fetchComptoirDuLibre";
import { fetchCnllPrestatairesSill } from "./fetchCnllPrestatairesSill";
import type { Db, CompiledData, WikidataData } from "./types";

export async function compileData(params: {
    db: Db;
    //NOTE: CompiledData["catalog"] is assignable to this
    wikidataCacheCache:
        | {
              wikidataData?: WikidataData;
          }[]
        | undefined;
    log?: typeof console.log;
}): Promise<CompiledData<"with referents">> {
    const {
        db: { softwareRows, agentRows, softwareReferentRows, softwareUserRows, instanceRows },
        wikidataCacheCache,
        log = () => {
            /*nothing*/
        }
    } = params;

    const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] = await Promise.all([
        fetchComptoirDuLibre(),
        fetchCnllPrestatairesSill()
    ]);

    const wikiDataDataById: Record<string, WikidataData | undefined> = {};

    {
        const wikidataIds = softwareRows.map(({ wikidataId }) => wikidataId).filter(exclude(undefined));

        for (let i = 0; i < wikidataIds.length; i++) {
            const wikidataId = wikidataIds[i];

            log(`Fetching WikiData entry ${wikidataId} (${i + 1}/${wikidataIds.length})`);

            wikiDataDataById[wikidataId] =
                wikidataCacheCache?.find(({ wikidataData }) => wikidataData?.id === wikidataId)?.wikidataData ??
                (await fetchWikiDataData({ wikidataId }));
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
            }): CompiledData.Software<"with referents"> => ({
                ...rest,
                "wikidataData": wikidataId === undefined ? undefined : wikiDataDataById[wikidataId],
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
}
