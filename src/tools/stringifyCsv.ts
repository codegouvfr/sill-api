import { parse as csvParseSync } from "csv-parse/sync";

export function rawCsvFileToRawCsvRows(params: {
    rawCsvFile: string;
}): Record<string, string>[] {
    const { rawCsvFile } = params;
    return csvParseSync(rawCsvFile, {
        "columns": true,
        "skip_empty_lines": true,
    });
}
