import type { Software, Referent, Api, ComptoirDuLibre, Service } from "./types";
import fetch from "node-fetch";
import { assert } from "tsafe/assert";
import { exclude } from "tsafe/exclude";

const cdlUrl = "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export async function buildApiData(params: {
    softwares: Software[];
    referents: Referent[];
    services: Service[];
}): Promise<{ api: Api }> {
    const { softwares, referents, services } = params;

    const { softwares: cdlSoftwares } = await fetch(cdlUrl)
        .then(res => res.text())
        .then(text => JSON.parse(text) as ComptoirDuLibre);

    const api = softwares
        .map(softwares => {
            const { referentId } = softwares;

            if (referentId === undefined) {
                return [softwares, undefined] as const;
            }

            return [softwares, referents.find(({ id }) => id === referentId)] as const;
        })
        .map(([software, referent]): Api[number] => ({
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
            "hasReferent": referent !== undefined,
            "workshopUrl": software.workshopUrl ?? null,
            "testUrl": software.testUrl ?? null,
            "useCasesUrl": software.useCasesUrl,
            "services": services
                .map(service => (service.softwareId !== undefined ? service : undefined))
                .filter(exclude(undefined))
                .filter(({ softwareId }) => softwareId !== undefined && softwareId === software._id),
        }));

    return { api };
}
