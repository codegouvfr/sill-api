/* eslint-disable @typescript-eslint/no-namespace */
import {
    join as pathJoin,
    dirname as pathDirname,
    basename as pathBasename,
} from "path";
import { csvToModel } from "../model/csvToModel";
import { collectSoftware } from "../model/collectSoftware";
import * as fs from "fs";
import { exclude } from "tsafe/exclude";
import { rawCsvFileToRawCsvRows } from "../tools/parseAndStringifyCsv";
import { NoReferentCredentialsSoftware } from "../model/types";

const projectDirPath = pathJoin(__dirname, "..", "..");
export const dataDirPath = pathJoin(projectDirPath, "data");

export const [softwareCsvFilePath, referentsCsvFilePath, csvServicesPath] = [
    ["software", "software.csv"],
    ["referents", "referents.csv"],
    ["services", "services.csv"],
].map(path => pathJoin(...[dataDirPath, ...path]));

export const [
    softwareCsvRowsJsonFilePath,
    referentCsvRowsJsonFilePath,
    serviceCsvRowsJsonPath,
] = [softwareCsvFilePath, referentsCsvFilePath, csvServicesPath].map(path =>
    path.replace(/csv$/, "json"),
);

export const softwareJsonFilePath = pathJoin(dataDirPath, "software.json");

if (require.main === module) {
    const softwareWithoutReferentJsonFilePath = pathJoin(
        pathDirname(softwareCsvRowsJsonFilePath),
        "softwaresWithoutReferent.json",
    );

    const servicesWithoutKnownSoftwareJsonFilePath = pathJoin(
        pathDirname(serviceCsvRowsJsonPath),
        "servicesWithoutKnownSoftware.json",
    );

    const referentsStatsJsonFilePath = pathJoin(
        pathDirname(referentCsvRowsJsonFilePath),
        "referentsStats.json",
    );

    const noReferentCredentialSoftwareJsonFilePath = pathJoin(
        pathDirname(softwareJsonFilePath),
        `noReferentCredential_${pathBasename(softwareJsonFilePath)}`,
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

        const noReferentCredentialSoftwares = softwares.map(
            ({ referentEmail, ...rest }): NoReferentCredentialsSoftware => ({
                ...rest,
                "hasReferent": referentEmail !== null,
            }),
        );

        const softwaresWithoutReferent = softwares
            .filter(({ referentEmail }) => referentEmail === null)
            .map(({ name, id }) => ({ id, name }));

        const servicesWithoutKnownSoftware = servicesCsvRows
            .map(services =>
                services.softwareId === undefined ? services : undefined,
            )
            .filter(exclude(undefined));

        for (const [path, data] of [
            [softwareCsvRowsJsonFilePath, softwareCsvRows],
            [referentCsvRowsJsonFilePath, referentCsvRows],
            [serviceCsvRowsJsonPath, servicesCsvRows],
            [softwareJsonFilePath, softwares],
            [
                noReferentCredentialSoftwareJsonFilePath,
                noReferentCredentialSoftwares,
            ],
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
