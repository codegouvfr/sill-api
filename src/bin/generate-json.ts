/* eslint-disable @typescript-eslint/no-namespace */
import { join as pathJoin, dirname as pathDirname } from "path";
import { csvToModel } from "../model/csvToModel";
import { collectSoftware } from "../model/collectSoftware";
import * as fs from "fs";
import { exclude } from "tsafe/exclude";
import { rawCsvFileToRawCsvRows } from "../tools/parseAndStringifyCsv";

export const projectDirPath = pathJoin(__dirname, "..", "..");
export const dataDirPath = pathJoin(projectDirPath, "data");

export const [softwareCsvFilePath, referentsCsvFilePath, csvServicesPath] = [
    ["software", "software.csv"],
    ["referents", "referents.csv"],
    ["services", "services.csv"],
].map(path => pathJoin(...[dataDirPath, ...path]));

export const [softwareJsonFilePath, referentsJsonFilePath, servicesJsonPath] = [
    softwareCsvFilePath,
    referentsCsvFilePath,
    csvServicesPath,
].map(path => path.replace(/csv$/, "json"));

export const sillFilePath = pathJoin(
    pathDirname(softwareJsonFilePath),
    "..",
    "sill2.json",
);

if (require.main === module) {
    const softwareWithoutReferentJsonFilePath = pathJoin(
        pathDirname(softwareJsonFilePath),
        "softwaresWithoutReferent.json",
    );

    const servicesWithoutKnownSoftwareJsonFilePath = pathJoin(
        pathDirname(servicesJsonPath),
        "servicesWithoutKnownSoftware.json",
    );

    const referentsStatsJsonFilePath = pathJoin(
        pathDirname(referentsJsonFilePath),
        "referentsStats.json",
    );

    const [rawSoftwareCsvRows, rawReferentCsvRows, rawServiceCsvRow] = [
        softwareCsvFilePath,
        referentsCsvFilePath,
        csvServicesPath,
    ].map(path =>
        rawCsvFileToRawCsvRows({
            "rawCsvFile": fs.readFileSync(path).toString("utf8"),
        }),
    );

    (async () => {
        const {
            softwareCsvRows,
            referentCsvRows,
            servicesCsvRows,
            referentsStats,
        } = csvToModel({
            rawSoftwareCsvRows,
            rawReferentCsvRows,
            rawServiceCsvRow,
        });

        const softwares = await collectSoftware({
            softwareCsvRows,
            referentCsvRows,
            servicesCsvRows,
            "log": console.log,
        });

        const softwaresWithoutReferent = softwares
            .filter(({ hasReferent }) => !hasReferent)
            .map(({ name, id }) => ({ id, name }));

        const servicesWithoutKnownSoftware = servicesCsvRows
            .map(services =>
                services.softwareId === undefined ? services : undefined,
            )
            .filter(exclude(undefined));

        for (const [path, data] of [
            [softwareJsonFilePath, softwareCsvRows],
            [referentsJsonFilePath, referentCsvRows],
            [servicesJsonPath, servicesCsvRows],
            [sillFilePath, softwares],
            [softwareWithoutReferentJsonFilePath, softwaresWithoutReferent],
            [referentsStatsJsonFilePath, referentsStats],
            [
                servicesWithoutKnownSoftwareJsonFilePath,
                servicesWithoutKnownSoftware,
            ],
        ] as const) {
            fs.writeFileSync(path, Buffer.from(JSON.stringify(data, null, 2)));
        }
    })();
}
