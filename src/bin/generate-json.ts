/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { parseCsv } from "../parseCsv";
import { buildApiDataEntries } from "../buildApiDataEntries";
import * as fs from "fs";

const projectDirPath = pathJoin(__dirname, "..", "..");

const [csvSoftwaresPath, csvReferentsPath] = [
    ["softwares", "softwares.csv"],
    ["referents", "referents.csv"],
].map(path => pathJoin(...[projectDirPath, "data", ...path]));

const [jsonSoftwaresFilePath, jsonReferentsFilePath] = [csvSoftwaresPath, csvReferentsPath].map(path =>
    path.replace(/csv$/, "json"),
);
const jsonApiFilePath = pathJoin(pathDirname(jsonSoftwaresFilePath), "..", "api.json");

if (require.main === module) {
    const { softwares, referents } = parseCsv({
        csvSoftwaresPath,
        csvReferentsPath,
    });

    const { dataEntries } = buildApiDataEntries({ softwares, referents });

    for (const [path, data] of [
        [jsonSoftwaresFilePath, softwares],
        [jsonReferentsFilePath, referents],
        [jsonApiFilePath, dataEntries],
    ] as const) {
        fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
    }
}
