/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { parseCsv } from "../parseCsv";
import { buildApiSoftwares } from "../buildApiSoftwares";
import * as fs from "fs";

const projectDirPath = pathJoin(__dirname, "..", "..");

const [csvSoftwaresPath, csvReferentsPath, csvPapillonServicesPath] = [
    ["softwares", "softwares.csv"],
    ["referents", "referents.csv"],
    ["papillonServices", "papillonServices.csv"],
].map(path => pathJoin(...[projectDirPath, "data", ...path]));

const [jsonSoftwaresFilePath, jsonReferentsFilePath, jsonPapillonServicesPath] = [
    csvSoftwaresPath,
    csvReferentsPath,
    csvPapillonServicesPath,
].map(path => path.replace(/csv$/, "json"));
const jsonApiFilePath = pathJoin(pathDirname(jsonSoftwaresFilePath), "..", "sill2.json");
const jsonSoftwaresWithoutReferentPath = pathJoin(
    pathDirname(jsonSoftwaresFilePath),
    "softwaresWithoutReferent.json",
);

const jsonReferentsStatsPath = pathJoin(pathDirname(jsonReferentsFilePath), "referentsStats.json");

if (require.main === module) {
    (async () => {
        const { softwares, referents, papillonServices, referentsStats } = parseCsv({
            csvSoftwaresPath,
            csvReferentsPath,
            csvPapillonServicesPath,
        });

        const { api } = await buildApiSoftwares({ softwares, referents, papillonServices });

        const softwaresWithoutReferent = api.softwares
            .filter(({ hasReferent }) => !hasReferent)
            .map(({ name, id }) => ({ id, name }));

        for (const [path, data] of [
            [jsonSoftwaresFilePath, softwares],
            [jsonReferentsFilePath, referents],
            [jsonPapillonServicesPath, papillonServices],
            [jsonApiFilePath, api],
            [jsonSoftwaresWithoutReferentPath, softwaresWithoutReferent],
            [jsonReferentsStatsPath, referentsStats],
        ] as const) {
            fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
        }
    })();
}
