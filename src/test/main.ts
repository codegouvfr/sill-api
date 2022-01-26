/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin } from "path";
import { sillCsvToSoftwares } from "../parser";

const projectDirPath = pathJoin(__dirname, "..", "..");
const resDirPath = pathJoin(projectDirPath, "res");

const softwares = sillCsvToSoftwares({
    "pathToSillCsvFile": pathJoin(resDirPath, "sill.csv"),
});

console.log(softwares);
