/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { parseCsv } from "../parseCsv";
import { buildApiData } from "../buildApiData";
import * as fs from "fs";
import { exclude } from "tsafe/exclude";

const projectDirPath = pathJoin(__dirname, "..", "..");

const [csvSoftwaresPath, csvReferentsPath, csvServicesPath] = [
    ["softwares", "softwares.csv"],
    ["referents", "referents.csv"],
    ["services", "services.csv"],
].map(path => pathJoin(...[projectDirPath, "data", ...path]));

const [jsonSoftwaresFilePath, jsonReferentsFilePath, jsonServicesPath] = [
    csvSoftwaresPath,
    csvReferentsPath,
    csvServicesPath,
].map(path => path.replace(/csv$/, "json"));
const jsonApiFilePath = pathJoin(pathDirname(jsonSoftwaresFilePath), "..", "sill2.json");
const jsonSoftwaresWithoutReferentPath = pathJoin(
    pathDirname(jsonSoftwaresFilePath),
    "softwaresWithoutReferent.json",
);

const jsonServicesWithoutKnownSoftwarePath = pathJoin(
    pathDirname(jsonServicesPath),
    "servicesWithoutKnownSoftware.json",
);

const jsonReferentsStatsPath = pathJoin(pathDirname(jsonReferentsFilePath), "referentsStats.json");

if (require.main === module) {
    (async () => {
        const { softwares, referents, services, referentsStats } = parseCsv({
            csvSoftwaresPath,
            csvReferentsPath,
            csvServicesPath,
        });

        const { api } = await buildApiData({ softwares, referents, services });

        const softwaresWithoutReferent = api
            .filter(({ hasReferent }) => !hasReferent)
            .map(({ name, id }) => ({ id, name }));

        const servicesWithoutKnownSoftware = services
            .map(services => (services.softwareId === undefined ? services : undefined))
            .filter(exclude(undefined));

        for (const [path, data] of [
            [jsonSoftwaresFilePath, softwares],
            [jsonReferentsFilePath, referents],
            [jsonServicesPath, services],
            [jsonApiFilePath, api],
            [jsonSoftwaresWithoutReferentPath, softwaresWithoutReferent],
            [jsonReferentsStatsPath, referentsStats],
            [jsonServicesWithoutKnownSoftwarePath, servicesWithoutKnownSoftware],
        ] as const) {
            fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
        }
    })();
}
