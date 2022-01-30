/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { sillCsvToSoftwares } from "../parseCsvFiles";
import * as fs from "fs";

const projectDirPath = pathJoin(__dirname, "..", "..");

const pathToSillCsvFile = pathJoin(projectDirPath, "sill.csv");
const pathToSillReferentsCsvFile = pathJoin(projectDirPath, "sill-referents", "sill-referents.csv");

export const pathToSillSoftwaresJson = pathJoin(pathDirname(pathToSillCsvFile), "sill-softwares.json");
export const pathToSillReferentsJson = pathJoin(
    pathDirname(pathToSillReferentsCsvFile),
    "sill-referents.json",
);

if (require.main === module) {
    const { softwares, referents } = sillCsvToSoftwares({
        pathToSillCsvFile,
        pathToSillReferentsCsvFile,
    });

    for (const [path, data] of [
        [pathToSillSoftwaresJson, softwares],
        [pathToSillReferentsJson, referents],
    ] as const) {
        fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
    }
}
