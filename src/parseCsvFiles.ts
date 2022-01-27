/* eslint-disable @typescript-eslint/no-namespace */
import { parse as parseCsv } from "csv-parse/sync";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import type { Software, Referent, SoftwareRef } from "./types";
import { matchReferent, matchSoftware } from "./validators/typeValidators";
import { validateAllRelations } from "./validators/relationsValidators";

export function sillCsvToSoftwares(params: {
    pathToSillCsvFile: string;
    pathToSillReferentsCsvFile: string;
}): {
    softwares: Software[];
    referents: Referent[];
} {
    const { pathToSillCsvFile, pathToSillReferentsCsvFile } = params;

    const referentEntries: any[] = parseCsv(
        fs.readFileSync(pathToSillReferentsCsvFile).toString("utf8"),
        {
            "columns": true,
            "skip_empty_lines": true,
        },
    );

    const referents: Referent[] = [];

    {
        const getUniqReferentId = (() => {
            let counter = 0;

            return () => counter++;
        })();

        referentEntries.forEach(entry =>
            referents.push({
                "id": getUniqReferentId(),
                "email": (() => {
                    /* cspell: disable-next-line */
                    const src = entry["Courriel"];

                    assert(src !== "");

                    return src;
                })(),
            }),
        );
    }

    const softwares: Software[] = [];

    const sillEntries: any[] = parseCsv(fs.readFileSync(pathToSillCsvFile).toString("utf8"), {
        "columns": true,
        "skip_empty_lines": true,
    });

    const parentSoftwareNameBySoftwareId = new Map<number, string>();

    sillEntries.forEach(entry => {
        const softwareId = (() => {
            const src = entry["ID"];

            const out = parseInt(src);

            assert(!isNaN(out));

            return out;
        })();

        const name = (() => {
            const src = entry["nom"];

            assert(typeof src === "string");

            return src;
        })();

        const software: Software = {
            "id": softwareId,
            name,
            "function": (() => {
                /* cspell: disable-next-line */
                const src = entry["fonction"];

                assert(typeof src === "string");

                return src;
            })(),
            "referencedSinceTime": (() => {
                /* cspell: disable-next-line */
                const src = entry["annees"];

                const firstYear = src.replace(/ /g, "").split(";");

                assert(/[0-9]{4,4}/.test(firstYear));

                return new Date(firstYear).getTime();
            })(),
            "recommendationStatus": (() => {
                /* cspell: disable-next-line */
                const src = entry["statut"];

                switch (src) {
                    case "O":
                        return "in observation";
                    case "R":
                        return "recommended";
                    case "FR":
                        return "no longer recommended";
                }

                assert(false);
            })(),
            //TODO: in a second step
            "parentSoftware": (() => {
                const src = entry["parent"];

                if (src === "") {
                    return undefined;
                }

                parentSoftwareNameBySoftwareId.set(softwareId, src);

                return null as any;
            })(),
            "isFromFrenchPublicService": (() => {
                const src = entry["public"];

                assert(["", "Oui"].includes(src));

                return src === "Oui";
            })(),
            "isPresentInSupportContract": (() => {
                const src = entry["support"];

                assert(["", "Oui"].includes(src));

                return src === "Oui";
            })(),
            "alikeSoftwares": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["similaire-a"];

                if (src === "") {
                    return [];
                }

                const out = src
                    .replace(/,/g, ";")
                    .replace(/ /g, "")
                    .split(";")
                    .map(idAsStringOrName => {
                        const id = parseInt(idAsStringOrName);

                        return isNaN(id) ? idAsStringOrName : id;
                    })
                    .map(
                        (idOrName): SoftwareRef =>
                            typeof idOrName === "string"
                                ? {
                                      "isKnown": false,
                                      "softwareName": idOrName,
                                  }
                                : {
                                      "isKnown": true,
                                      "softwareId": idOrName,
                                  },
                    );

                return out;
            })(),
            "wikidataId": (() => {
                const src: string = entry["wikidata"];

                if (src === "") {
                    return undefined;
                }

                return src;
            })(),
            /* cspell: disable-next-line */
            "comptoirDuLibreOrgId": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["comptoir-du-libre"];

                if (src === "") {
                    return undefined;
                }

                const out = parseInt(src);

                assert(!isNaN(out));

                return out;
            })(),
            "license": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["licence"];

                //TODO
                return src as any;
            })(),
            "whereAndInWhatContextIsItUsed": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["contexte-usage"];

                if (src === "") {
                    return undefined;
                }

                return src;
            })(),
            /* cspell: disable-next-line */
            "catalogNumeriqueGouvFrId": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["label"];

                if (src === "") {
                    return undefined;
                }

                assert(src.startsWith("https://catalogue.numerique.gouv.fr/solutions/"));

                return src.split("/").reverse()[0];
            })(),
            "mimGroup": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["groupe"];

                assert(src !== "");

                return src as any;
            })(),
            "versionMin": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["version_min"];

                assert(src !== "");

                return src as any;
            })(),
            "versionMax": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["version_max"];

                if (src === "") {
                    return undefined;
                }

                return src;
            })(),
            ...(() => {
                const referentEntry:
                    | {
                          Courriel: string;
                          "Référent : expert technique ?": string;
                      }
                    | undefined = referentEntries.find(entry => entry["Logiciel"] === name);

                assert(referentEntry !== undefined);

                const referent = referents.find(
                    referent => referent.email === referentEntry["Courriel"],
                );

                assert(referent !== undefined);

                assert(["", "Oui"].includes(referentEntry["Référent : expert technique ?"]));

                return {
                    "referentId": referent.id,
                    "isReferentExpert": referentEntry["Référent : expert technique ?"] === "Oui",
                };
            })(),
        };

        softwares.push(software);
    });

    softwares.forEach(software => {
        const parentSoftwareName = parentSoftwareNameBySoftwareId.get(software.id);

        if (parentSoftwareName === undefined) {
            return;
        }

        const parentSoftware = softwares.find(({ name }) => {
            const t = (name: string) => name.toLowerCase().replace(/ /g, "");

            return t(name) === t(parentSoftwareName);
        });

        software.parentSoftware =
            parentSoftware === undefined
                ? {
                      "isKnown": false,
                      "softwareName": parentSoftwareName,
                  }
                : {
                      "isKnown": true,
                      "softwareId": parentSoftware.id,
                  };
    });

    softwares.forEach(software => assert(matchSoftware(software)));
    referents.forEach(referent => assert(matchReferent(referent)));

    validateAllRelations({ softwares, referents });

    return { softwares, referents };
}
