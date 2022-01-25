import { parse as parseCsv } from "csv-parse/sync";
import { join as pathJoin } from "path";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import { is } from "tsafe/is";

const projectDirPath = pathJoin(__dirname, "..");
const resDirPath = pathJoin(projectDirPath, "res");

type SoftwareRef =
    | {
          isInSill: true;
          softwareId: number;
      }
    | {
          isInSill: false;
          softwareName: string;
      };

// https://git.sr.ht/~etalab/sill
type Software = {
    id: number;
    name: string;
    function: string;
    referencedSinceTime: number;
    recommendationStatus: "recommended" | "in observation" | "no longer recommended";
    parentSoftware?: SoftwareRef;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares: SoftwareRef[];
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibrOrgeId?: string;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    license: "LGPL-2.0-only" | "MIT";
    usageContext?: string;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    groupe: "MIMO" | "MIMDEV";
    versionMin: string;
    versionMax?: string;
    referentId: number;
};

function sillCsvToSoftwares(params: { pathToSillCsvFile: string }): Software[] {
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
            "parentSoftwareId": (() => {
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
                                      "isInSill": false,
                                      "softwareName": idOrName,
                                  }
                                : {
                                      "isInSill": true,
                                      "softwareId": idOrName,
                                  },
                    );
            })(),
            "wikidataId": "",
            /* cspell: disable-next-line */
            "comptoirDuLibrOrgeId": undefined,
            "license": "MIT",
            "usageContext": undefined,
            /* cspell: disable-next-line */
            "catalogNumeriqueGouvFrId": undefined,
            "groupe": "MIMO",
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

        software.parentSoftwareId =
            parentSoftware === undefined
                ? {
                      "isInSill": false,
                      "softwareName": parentSoftwareName,
                  }
                : {
                      "isInSill": true,
                      "softwareId": parentSoftware.id,
                  };
    });

    return softwares;
}

function isSoftwareRef(obj: any, softwares: Software[]): obj is SoftwareRef {
    assert(is<SoftwareRef>(obj));

    try {
        if (obj.isInSill) {
            const software = softwares.find(({ id }) => obj.softwareId === id);

            assert(software !== undefined);
        } else {
            assert(typeof obj.softwareName === "string");
        }
    } catch {
        return false;
    }

    return true;
}

function isSoftware(obj: any, softwares: Software[]): obj is Software {
    assert(is<Software>(obj));

    try {
        assert(
            typeof obj.id === "number" &&
                typeof obj.name === "string" &&
                typeof obj.function === "string" &&
                typeof obj.referencedSinceTime === "",
        );

        scope: {
            const { parentSoftware: softwareRef } = obj;

            if (softwareRef === undefined) {
                break scope;
            }

            assert(isSoftwareRef(softwareRef, softwares));
        }

        obj.alikeSoftwares.forEach(softwareRef => assert(isSoftwareRef(softwareRef, softwares)));
    } catch {
        return false;
    }

    return true;
}

sillCsvToSoftwares({
    "pathToSillCsvFile": pathJoin(resDirPath, "sill.csv"),
});
