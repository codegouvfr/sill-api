import { parse as csvParseSync } from "csv-parse/sync";
import { stringify as csvStringifySync_base } from "csv-stringify/sync";

export function rawCsvFileToRawCsvRows(params: {
    rawCsvFile: string;
}): Record<string, string>[] {
    const { rawCsvFile } = params;
    return csvParseSync(rawCsvFile, {
        "columns": true,
        "skip_empty_lines": true,
    });
}

export function rawCsvRowsToRawCsvFile(params: {
    rawCsvRows: Record<string, string>[];
}) {
    const { rawCsvRows } = params;

    return [
        Object.keys(rawCsvRows[0]).join(","),
        csvStringifySync_base(rawCsvRows),
    ].join("\n");
}
