/* eslint-disable @typescript-eslint/no-namespace */
import { parse as parseCsv } from "csv-parse/sync";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import type { Software, SoftwareRef } from "./types";

export function sillCsvToSoftwares(params: { pathToSillCsvFile: string }): Software[] {
    const { pathToSillCsvFile } = params;

    const softwares: Software[] = [];

    const entries: any[] = parseCsv(fs.readFileSync(pathToSillCsvFile).toString("utf8"), {
        "columns": true,
        "skip_empty_lines": true,
    });

    console.log(entries[0]);

    const parentSoftwareNameBySoftwareId = new Map<number, string>();

    entries.forEach(entry => {
        const softwareId = (() => {
            const src = entry["ID"];

            const out = parseInt(src);

            assert(!isNaN(out));

            return out;
        })();

        const software: Software = {
            "id": softwareId,
            "name": (() => {
                const src = entry["nom"];

                assert(typeof src === "string");

                return src;
            })(),
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

                return src
                    .replace(/,/g, ";")
                    .replace(/ /g, "")
                    .split(";")
                    .map(idAsStringOrName => {
                        const id = parseInt(idAsStringOrName);

                        return isNaN(id) ? id : idAsStringOrName;
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
            })(),
            "wikidataId": "",
            /* cspell: disable-next-line */
            "comptoirDuLibreOrgId": undefined,
            "license": "MIT",
            "usageContext": undefined,
            /* cspell: disable-next-line */
            "catalogNumeriqueGouvFrId": undefined,
            "mimGroup": "MIMO",
            "versionMin": "",
            "versionMax": undefined,
            "referentId": 33,
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

    return softwares;
}
