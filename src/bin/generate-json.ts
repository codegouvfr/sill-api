/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { parseCsv } from "../parseCsv";
import { buildApiSoftwares } from "../buildApiSoftwares";
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
const jsonSoftwaresWithoutReferentPath = pathJoin(
    pathDirname(jsonSoftwaresFilePath),
    "softwaresWithoutReferent.json",
);

if (require.main === module) {
    const { softwares, referents } = parseCsv({
        csvSoftwaresPath,
        csvReferentsPath,
    });

    const { apiSoftwares } = buildApiSoftwares({ softwares, referents });

    const softwaresWithoutReferent = apiSoftwares
        .filter(({ referent }) => referent === null)
        .map(({ name, id }) => ({ id, name }));

    for (const [path, data] of [
        [jsonSoftwaresFilePath, softwares],
        [jsonReferentsFilePath, referents],
        [jsonApiFilePath, apiSoftwares],
        [jsonSoftwaresWithoutReferentPath, softwaresWithoutReferent],
    ] as const) {
        fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
    }
}
