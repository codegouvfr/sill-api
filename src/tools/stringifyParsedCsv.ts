import { stringify as csvStringifySync_base } from "csv-stringify/sync";

export function stringifyParsedCsv(parsedCsv: any[]) {
    return [
        Object.keys(parsedCsv[0]).join(","),
        csvStringifySync_base(parsedCsv),
    ].join("\n");
}
