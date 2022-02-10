import type { Software, Referent, Api, ComptoirDuLibre, PapillonService } from "./types";
import fetch from "node-fetch";
import { assert } from "tsafe/assert";
import { id } from "tsafe/id";

const cdlUrl = "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export async function buildApiSoftwares(params: {
    softwares: Software[];
    referents: Referent[];
    papillonServices: PapillonService[];
}): Promise<{ api: Api }> {
    const { softwares, referents, papillonServices } = params;

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
            ([software, referent]): Api.Software => ({
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
                /*
                "referent":
                    referent === undefined
                        ? null
                        : {
                              "email": referent.email,
                              "emailAlt": referent.emailAlt ?? null,
                              "isReferentExpert": software.isReferentExpert ?? null,
                          },
                */
                "workshopUrl": software.workshopUrl ?? null,
                "testUrl": software.testUrl ?? null,
                "cardUrl": software.cardUrl ?? null,
            }),
        );

    const apiPapillonServices = papillonServices.map((papillonService): Api.PapillonService => {
        const common: Api.PapillonService.Common = {
            "id": papillonService.id,
            "agencyName": papillonService.agencyName,
            "publicSector": papillonService.publicSector,
            "agencyUrl": papillonService.agencyUrl,
            "serviceName": papillonService.serviceName,
            "serviceUrl": papillonService.serviceUrl,
            "description": papillonService.description,
            "publicationDate": papillonService.publicationDate,
            "lastUpdateDate": papillonService.lastUpdateDate,
            "signupScope": papillonService.signupScope,
            "usageScope": papillonService.usageScope,
            "signupValidationMethod": papillonService.signupValidationMethod,
            "contentModerationMethod": papillonService.contentModerationMethod,
        };

        return papillonService.softwareId === undefined
            ? id<Api.PapillonService.Unknown>({
                  ...common,
                  "softwareName": papillonService.softwareName,
                  "software": null,
                  "comptoirDuLibre":
                      papillonService.comptoirDuLibreId === undefined
                          ? null
                          : (() => {
                                const out = cdlSoftwares.find(
                                    ({ id }) => id === papillonService.comptoirDuLibreId,
                                );
                                assert(
                                    out !== undefined,
                                    `${papillonService.comptoirDuLibreId} is not a valid cdl id`,
                                );
                                return out;
                            })(),
              })
            : id<Api.PapillonService.Known>({
                  ...common,
                  "software": (() => {
                      const out = apiSoftwares.find(({ id }) => papillonService.softwareId === id);
                      assert(out !== undefined);
                      return out;
                  })(),
              });
    });

    const api: Api = {
        "softwares": apiSoftwares,
        "papillonServices": apiPapillonServices,
    };

    return { api };
}
