/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin } from "path";
import { sillCsvToSoftwares } from "../parseCsvFiles";

const projectDirPath = pathJoin(__dirname, "..", "..");

const softwares = sillCsvToSoftwares({
    "pathToSillCsvFile": pathJoin(projectDirPath, "sill.csv"),
    "pathToSillReferentsCsvFile": pathJoin(projectDirPath, "sill-referents", "sill-referents.csv"),
});

if (process.env === {}) {
    console.log(softwares);
}
