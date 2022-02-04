import type { Software, Referent, ApiSoftware, ComptoirDuLibre } from "./types";
import fetch from "node-fetch";
import { assert } from "tsafe/assert";

const cdlUrl = "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export async function buildApiSoftwares(params: {
    softwares: Software[];
    referents: Referent[];
}): Promise<{ apiSoftwares: ApiSoftware[] }> {
    const { softwares, referents } = params;

    const { softwares: cdlSoftwares } = await fetch(cdlUrl)
        .then(res => res.text())
        .then(text => JSON.parse(text) as ComptoirDuLibre);

    const apiSoftwares = softwares
        .map(softwares => {
            const { referentId } = softwares;

            if (referentId === undefined) {
                return [softwares, undefined] as const;
            }

            return [softwares, referents.find(({ id }) => id === referentId)] as const;
        })
        .map(
            ([software, referent]): ApiSoftware => ({
                "id": software._id,
                "name": software._name,
                "function": software._function,
                "referencedSinceYear": new Date(software.__referencedSinceTime).getFullYear().toString(),
                "recommendationStatus": software.recommendationStatus,
                "parentSoftware": software.parentSoftware ?? null,
                "isFromFrenchPublicService": software.isFromFrenchPublicService,
                "isPresentInSupportContract": software.isPresentInSupportContract,
                "alikeSoftwares": software.alikeSoftwares,
                "wikidataId": software.wikidataId ?? null,
                "comptoirDuLibreSoftware":
                    software.comptoirDuLibreId === undefined
                        ? null
                        : (() => {
                              const cdlSoftware = cdlSoftwares.find(
                                  ({ id }) => software.comptoirDuLibreId === id,
                              );

                              assert(
                                  cdlSoftware !== undefined,
                                  `Comptoir du libre id: ${software.comptoirDuLibreId} does not match ant software in ${cdlUrl}`,
                              );

                              return cdlSoftware;
                          })(),
                "license": software._license,
                "whereAndInWhatContextIsItUsed": software.whereAndInWhatContextIsItUsed ?? null,
                "catalogNumeriqueGouvFrId": software.catalogNumeriqueGouvFrId ?? null,
                "mimGroup": software.mimGroup,
                "versionMin": software.__versionMin,
                "versionMax": software.versionMax ?? null,
                "referent":
                    referent === undefined
                        ? null
                        : {
                              "email": referent.email,
                              "emailAlt": referent.emailAlt ?? null,
                              "isReferentExpert": software.isReferentExpert ?? null,
                          },
            }),
        );

    return { apiSoftwares };
}
