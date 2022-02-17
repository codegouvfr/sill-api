import type {
    SoftwareX,
    SoftwareCsvRow,
    ReferentCsvRow,
    ServiceCsvRow,
    WikidataData,
} from "../types";
import { assert } from "tsafe/assert";
import { exclude } from "tsafe/exclude";
import { fetchWikiDataData } from "./fetchWikiDataData";
import { fetchComptoirDuLibre } from "./fetchComptoirDuLibre";

export async function collectSoftware(params: {
    softwareCsvRows: SoftwareCsvRow[];
    referentCsvRows: ReferentCsvRow[];
    servicesCsvRows: ServiceCsvRow[];
    log: typeof console.log;
}): Promise<SoftwareX[]> {
    const { softwareCsvRows, referentCsvRows, servicesCsvRows, log } = params;

    const { softwares: cdlSoftwares } = await fetchComptoirDuLibre();

    const wikiDataDataById: Record<string, WikidataData> = {};

    {
        const wikidataIds = softwareCsvRows
            .map(({ wikidataId }) => wikidataId)
            .filter(exclude(undefined));

        for (let i = 0; i < wikidataIds.length; i++) {
            const wikidataId = wikidataIds[i];

            log(
                `Fetching WikiData entry ${wikidataId} (${i + 1}/${
                    wikidataIds.length
                })`,
            );

            wikiDataDataById[wikidataId] = await fetchWikiDataData({
                wikidataId,
            });
        }
    }

    return softwareCsvRows
        .map(softwareCsvRow => {
            const { referentId } = softwareCsvRow;

            if (referentId === undefined) {
                return [softwareCsvRow, undefined] as const;
            }

            return [
                softwareCsvRow,
                referentCsvRows.find(({ id }) => id === referentId),
            ] as const;
        })
        .map(
            ([software, referent]): SoftwareX => ({
                "id": software._id,
                "name": software._name,
                "function": software._function,
                "referencedSinceYear": new Date(software.__referencedSinceTime)
                    .getFullYear()
                    .toString(),
                "recommendationStatus": software.recommendationStatus,
                "parentSoftware": software.parentSoftware ?? null,
                "isFromFrenchPublicService": software.isFromFrenchPublicService,
                "isPresentInSupportContract":
                    software.isPresentInSupportContract,
                "alikeSoftwares": software.alikeSoftwares,
                "wikidata":
                    software.wikidataId === undefined
                        ? null
                        : wikiDataDataById[software.wikidataId]!,
                "comptoirDuLibreSoftware":
                    software.comptoirDuLibreId === undefined
                        ? null
                        : (() => {
                              const cdlSoftware = cdlSoftwares.find(
                                  ({ id }) => software.comptoirDuLibreId === id,
                              );

                              assert(
                                  cdlSoftware !== undefined,
                                  `Comptoir du libre id: ${software.comptoirDuLibreId} does not match ant software`,
                              );

                              return cdlSoftware;
                          })(),
                "license": software._license,
                "whereAndInWhatContextIsItUsed":
                    software.whereAndInWhatContextIsItUsed ?? null,
                "catalogNumeriqueGouvFrId":
                    software.catalogNumeriqueGouvFrId ?? null,
                "mimGroup": software.mimGroup,
                "versionMin": software.__versionMin,
                "versionMax": software.versionMax ?? null,
                "hasReferent": referent !== undefined,
                "workshopUrl": software.workshopUrl ?? null,
                "testUrl": software.testUrl ?? null,
                "useCasesUrl": software.useCasesUrl,
                "services": servicesCsvRows
                    .map(servicesCsvRow =>
                        servicesCsvRow.softwareId !== undefined
                            ? servicesCsvRow
                            : undefined,
                    )
                    .filter(exclude(undefined))
                    .filter(
                        ({ softwareId }) =>
                            softwareId !== undefined &&
                            softwareId === software._id,
                    ),
            }),
        );
}
