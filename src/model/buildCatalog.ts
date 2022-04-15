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

    const { softwares: cdlSoftwares } = await fetchComptoirDuLibre();

    const wikiDataDataById: Record<string, WikidataData> = {};

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
                )?.wikidataData ?? (await fetchWikiDataData(wikidataId));
        }
    }

    const catalog = softwareRows
        .map(softwareRow => ({
            softwareRow,
            "referents": softwareReferentRows
                .filter(({ softwareId }) => softwareId === softwareRow.id)
                .map(({ referentEmail, isExpert }) => ({
                    "referent": referentRows.find(
                        ({ email }) => email === referentEmail,
                    ),
                    isExpert,
                }))
                .map(
                    ({ referent, ...rest }) => (
                        assert(referent !== undefined), { referent, ...rest }
                    ),
                )
                .map(({ referent, isExpert }) => ({ ...referent, isExpert })),
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
                        : wikiDataDataById[wikidataId]!,
                "comptoirDuLibreSoftware":
                    comptoirDuLibreId === undefined
                        ? undefined
                        : (() => {
                              const cdlSoftware = cdlSoftwares.find(
                                  ({ id }) => comptoirDuLibreId === id,
                              );

                              assert(
                                  cdlSoftware !== undefined,
                                  `Comptoir du libre id: ${comptoirDuLibreId} does not match ant software`,
                              );

                              return cdlSoftware;
                          })(),
                referents,
            }),
        );

    return { catalog };
}
