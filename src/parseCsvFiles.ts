/* eslint-disable @typescript-eslint/no-namespace */
import { parse as csvParseSync } from "csv-parse/sync";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import type { Software, Referent, SoftwareRef } from "./types";
import { matchReferent, matchSoftware } from "./validators/typeValidators";
import { validateAllRelations } from "./validators/relationsValidators";

function parseCsv(path: string): any[] {
    return (
        csvParseSync(fs.readFileSync(path).toString("utf8"), {
            "columns": true,
            "skip_empty_lines": true,
        }) as any[]
    ).map(entry =>
        Object.fromEntries(
            Object.entries(entry).map(([key, value]) => [
                key.replace(/é/g, "e").replace(/[^\x20-\x7E]+/g, ""),
                value,
            ]),
        ),
    );
}

export function sillCsvToSoftwares(params: {
    pathToSillCsvFile: string;
    pathToSillReferentsCsvFile: string;
}): {
    softwares: Software[];
    referents: Referent[];
} {
    const { pathToSillCsvFile, pathToSillReferentsCsvFile } = params;

    const referentEntries: any[] = parseCsv(pathToSillReferentsCsvFile);

    const referents: Referent[] = [];

    {
        const getUniqReferentId = (() => {
            let counter = 0;

            return () => counter++;
        })();

        referentEntries.forEach(entry => {
            let referent: Referent;

            try {
                referent = {
                    "id": getUniqReferentId(),
                    "email": (() => {
                        /* cspell: disable-next-line */
                        const src = entry["Courriel"];

                        assert(src !== "");

                        return src;
                    })(),
                    "emailAlt": (() => {
                        /* cspell: disable-next-line */
                        const src = entry["Courriel 2"];

                        if (src === "") {
                            return undefined;
                        }

                        return src;
                    })(),
                };
                assert(matchReferent(referent));
            } catch {
                console.log("Referent entry dropped", entry);
                return;
            }

            referents.push(referent);
        });
    }

    const softwares: Software[] = [];

    const sillEntries = parseCsv(pathToSillCsvFile);

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
            "_id": softwareId,
            "_name": name,
            "_function": (() => {
                /* cspell: disable-next-line */
                const src = entry["fonction"];

                assert(typeof src === "string");

                return src;
            })(),
            "__referencedSinceTime": (() => {
                /* cspell: disable-next-line */
                const src = entry["annees"];

                const firstYear = src.replace(/ /g, "").split(";")[0];

                assert(/^[0-9]{4,4}$/.test(firstYear));

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
            "_license": (() => {
                /* cspell: disable-next-line */
                const src: string = entry["licence"];

                return src;
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
            "__versionMin": (() => {
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
                const referentEntry = (
                    referentEntries as {
                        Logiciel: string;
                        Courriel: string;
                        "Referent : expert technique ?": string;
                    }[]
                ).find(entry => entry["Logiciel"] === name);

                const referent =
                    referentEntry === undefined
                        ? undefined
                        : referents.find(referent => referent.email === referentEntry["Courriel"]);

                if (referentEntry === undefined || referent === undefined) {
                    return {
                        "referentId": undefined,
                        "isReferentExpert": undefined,
                    };
                }

                return {
                    "referentId": referent.id,
                    "isReferentExpert": (() => {
                        const src = referentEntry["Referent : expert technique ?"];

                        assert(["", "Oui", "Non"].includes(src), `=> ${src}`);

                        return referentEntry["Referent : expert technique ?"] === "Oui"
                            ? (true as const)
                            : undefined;
                    })(),
                };
            })(),
        };

        softwares.push(software);
    });

    softwares.forEach(software => {
        const parentSoftwareName = parentSoftwareNameBySoftwareId.get(software._id);

        if (parentSoftwareName === undefined) {
            return;
        }

        const parentSoftware = softwares.find(({ _name }) => {
            const t = (name: string) => name.toLowerCase().replace(/ /g, "");

            return t(_name) === t(parentSoftwareName);
        });

        software.parentSoftware =
            parentSoftware === undefined
                ? {
                      "isKnown": false,
                      "softwareName": parentSoftwareName,
                  }
                : {
                      "isKnown": true,
                      "softwareId": parentSoftware._id,
                  };
    });

    softwares.forEach(software => assert(matchSoftware(software)));
    referents.forEach(referent => assert(matchReferent(referent), JSON.stringify(referent)));

    validateAllRelations({ softwares, referents });

    return { softwares, referents };
}
