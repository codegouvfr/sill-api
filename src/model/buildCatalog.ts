import type {
    CompiledData,
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    WikidataData,
} from "./types";
import { assert } from "tsafe/assert";
import { exclude } from "tsafe/exclude";
import { fetchWikiDataData } from "./fetchWikiDataData";
import { fetchComptoirDuLibre } from "./fetchComptoirDuLibre";
import { fetchCnllPrestatairesSill } from "./fetchCnllPrestatairesSill";

export async function buildCatalog(params: {
    softwareRows: SoftwareRow[];
    referentRows: ReferentRow[];
    softwareReferentRows: SoftwareReferentRow[];
    log?: typeof console.log;
    currentCatalog: CompiledData.Software<"with referents">[] | undefined;
}): Promise<{ catalog: CompiledData.Software<"with referents">[] }> {
    const {
        softwareRows,
        referentRows,
        softwareReferentRows,
        currentCatalog,
        log = () => {
            /*nothing*/
        },
    } = params;

    const [{ softwares: cdlSoftwares }, cnllPrestatairesSill] =
        await Promise.all([
            fetchComptoirDuLibre(),
            fetchCnllPrestatairesSill(),
        ]);

    const wikiDataDataById: Record<string, WikidataData | undefined> = {};

    {
        const wikidataIds = softwareRows
            .map(({ wikidataId }) => wikidataId)
            .filter(exclude(undefined));

        for (let i = 0; i < wikidataIds.length; i++) {
            const wikidataId = wikidataIds[i];

            log(
                `Fetching WikiData entry ${wikidataId} (${i + 1}/${
                    wikidataIds.length
                })`,
            );

            wikiDataDataById[wikidataId] =
                currentCatalog?.find(
                    software => software.wikidataData?.id === wikidataId,
                )?.wikidataData ?? (await fetchWikiDataData({ wikidataId }));
        }
    }

    const catalog = softwareRows
        .map(softwareRow => ({
            softwareRow,
            "referents": softwareReferentRows
                .filter(({ softwareId }) => softwareId === softwareRow.id)
                .map(
                    ({
                        referentEmail,
                        isExpert,
                        useCaseDescription,
                        isPersonalUse,
                    }) => ({
                        "referent": referentRows.find(
                            ({ email }) => email === referentEmail,
                        ),
                        isExpert,
                        useCaseDescription,
                        isPersonalUse,
                    }),
                )
                .map(
                    ({ referent, ...rest }) => (
                        assert(referent !== undefined), { referent, ...rest }
                    ),
                )
                .map(
                    ({
                        referent,
                        isExpert,
                        useCaseDescription,
                        isPersonalUse,
                    }) => ({
                        ...referent,
                        isExpert,
                        useCaseDescription,
                        isPersonalUse,
                    }),
                ),
        }))
        .map(
            ({
                softwareRow: { wikidataId, comptoirDuLibreId, ...rest },
                referents,
            }): CompiledData.Software<"with referents"> => ({
                ...rest,
                "wikidataData":
                    wikidataId === undefined
                        ? undefined
                        : wikiDataDataById[wikidataId],
                "comptoirDuLibreSoftware":
                    comptoirDuLibreId === undefined
                        ? undefined
                        : (() => {
                              const cdlSoftware = cdlSoftwares.find(
                                  ({ id }) => comptoirDuLibreId === id,
                              );

                              assert(
                                  cdlSoftware !== undefined,
                                  `Comptoir du libre id: ${comptoirDuLibreId} does not match any software`,
                              );

                              return cdlSoftware;
                          })(),
                "annuaireCnllServiceProviders": cnllPrestatairesSill
                    .find(({ sill_id }) => sill_id === rest.id)
                    ?.prestataires.map(({ nom, siren, url }) => ({
                        "name": nom,
                        siren,
                        url,
                    })),
                referents,
            }),
        );

    return { catalog };
}
