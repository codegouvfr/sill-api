/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { sillCsvToSoftwares } from "../parseCsvFiles";
import * as fs from "fs";

const projectDirPath = pathJoin(__dirname, "..", "..");

const pathToSillCsvFile = pathJoin(projectDirPath, "sill.csv");
const pathToSillReferentsCsvFile = pathJoin(projectDirPath, "sill-referents", "sill-referents.csv");

const { softwares, referents } = sillCsvToSoftwares({
    pathToSillCsvFile,
    pathToSillReferentsCsvFile,
});

for (const [path, data] of [
    [pathJoin(pathDirname(pathToSillCsvFile), "sill-softwares.json"), softwares],
    [pathJoin(pathDirname(pathToSillReferentsCsvFile), "sill-referents.json"), referents],
] as const) {
    fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
}
