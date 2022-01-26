/* eslint-disable @typescript-eslint/no-namespace */
import { parse as parseCsv } from "csv-parse/sync";
import { join as pathJoin } from "path";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import { is } from "tsafe/is";
import { exclude } from "tsafe/exclude";

const projectDirPath = pathJoin(__dirname, "..");
const resDirPath = pathJoin(projectDirPath, "res");

export type SoftwareRef = SoftwareRef.Known | SoftwareRef.Unknown;
export namespace SoftwareRef {
    export type Known = {
        isKnown: true;
        softwareId: number;
    };

    export type Unknown = {
        isKnown: false;
        softwareName: string;
    };
}

const recommendationStatuses = ["recommended", "in observation", "no longer recommended"] as const;

type RecommendationStatus = typeof recommendationStatuses[number];

const licenses = ["LGPL-2.0-only", "MIT"] as const;

type Licenses = typeof licenses[number];

const mimGroups = ["MIMO", "MIMDEV"] as const;

type MimGroup = typeof mimGroups[number];

// https://git.sr.ht/~etalab/sill
type Software = {
    id: number;
    name: string;
    function: string;
    referencedSinceTime: number;
    recommendationStatus: RecommendationStatus;
    parentSoftware?: SoftwareRef;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares: SoftwareRef[];
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibreOrgId?: string;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    license: Licenses;
    usageContext?: string;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    mimGroup: MimGroup;
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

function isSoftwareRef(obj: any): obj is SoftwareRef {
    assert(is<SoftwareRef>(obj));

    try {
        assert(
            (obj.isKnown === true && typeof obj.softwareId === "number") ||
                (obj.isKnown === false && typeof obj.softwareName === "string"),
        );
    } catch {
        return false;
    }

    return true;
}

function isSoftware(obj: any): obj is Software {
    assert(is<Software>(obj));

    try {
        assert(
            [obj.id, obj.referencedSinceTime, obj.referentId]
                .map(value => typeof value === "number")
                .every(b => b) &&
                [obj.name, obj.function, obj.versionMin]
                    .map(value => typeof value === "string")
                    .every(b => b) &&
                [obj.isFromFrenchPublicService, obj.isPresentInSupportContract]
                    .map(value => typeof value === "boolean")
                    .every(b => b) &&
                [
                    obj.wikidataId,
                    obj.usageContext,
                    obj.comptoirDuLibreOrgId,
                    obj.catalogNumeriqueGouvFrId,
                    obj.versionMax,
                ]
                    .map(value => value === undefined || typeof value === "string")
                    .every(b => b) &&
                recommendationStatuses.includes(obj.recommendationStatus) &&
                licenses.includes(obj.license) &&
                mimGroups.includes(obj.mimGroup),
        );
    } catch {
        return false;
    }

    return true;
}

const { validateThatSoftwareCanBeInserted } = (() => {
    function isSoftwareRefValidReference(params: {
        softwareRef: SoftwareRef.Known;
        softwares: Software[];
    }) {
        const { softwareRef, softwares } = params;

        const software = softwares.find(({ id }) => softwareRef.softwareId === id);

        return software !== undefined;
    }

    function validateThatSoftwareCanBeInserted(params: {
        software: Software;
        softwares: Software[];
    }): void {
        const { software, softwares } = params;

        assert(
            softwares.find(({ id }) => id === software.id) === undefined,
            "There is already a software with this id",
        );

        software.alikeSoftwares
            .map(softwareRef => (softwareRef.isKnown ? softwareRef : undefined))
            .filter(exclude(undefined))
            .forEach(softwareRef =>
                assert(
                    isSoftwareRefValidReference({ softwareRef, softwares }),
                    `Alike software ${softwareRef.softwareId} is not not present in the software list`,
                ),
            );

        {
            const softwareRef = software.parentSoftware;

            if (softwareRef !== undefined && softwareRef.isKnown) {
                assert(
                    isSoftwareRefValidReference({ softwareRef, softwares }),
                    `Parent software ${softwareRef.softwareId} is not present in the software list`,
                );
            }
        }
    }

    return { validateThatSoftwareCanBeInserted };
})();

sillCsvToSoftwares({
    "pathToSillCsvFile": pathJoin(resDirPath, "sill.csv"),
});
