/* eslint-disable @typescript-eslint/no-namespace */
import { rawCsvRowsToRawCsvFile } from "../tools/parseAndStringifyCsv";
import { modelToCsv } from "../model/modelToCsv";
import {
    softwareCsvFilePath,
    referentsCsvFilePath,
    csvServicesPath,
    softwareJsonFilePath,
    referentsJsonFilePath,
    servicesJsonPath,
} from "./generate-json";
import type {
    SoftwareCsvRow,
    ReferentCsvRow,
    ServiceCsvRow,
} from "../model/types";
import * as fs from "fs";

if (require.main === module) {
    const [softwareCsvRows, referentCsvRows, serviceCsvRows] = (
        [softwareJsonFilePath, referentsJsonFilePath, servicesJsonPath] as const
    ).map(path => JSON.parse(fs.readFileSync(path).toString("utf8"))) as [
        SoftwareCsvRow[],
        ReferentCsvRow[],
        ServiceCsvRow[],
    ];

    const { rawSoftwareCsvRows, rawReferentCsvRows, rawServiceCsvRows } =
        modelToCsv({
            softwareCsvRows,
            referentCsvRows,
            serviceCsvRows,
        });

    for (const [path, rawCsvRows] of [
        [softwareCsvFilePath, rawSoftwareCsvRows],
        [referentsCsvFilePath, rawReferentCsvRows],
        [csvServicesPath, rawServiceCsvRows],
    ] as const) {
        fs.writeFileSync(
            path,
            Buffer.from(rawCsvRowsToRawCsvFile({ rawCsvRows })),
        );
    }
}
