/* eslint-disable @typescript-eslint/no-namespace */
import { stringifyParsedCsv } from "../lib/tools/stringifyParsedCsv";
import {
    softwaresToParsedCsv,
    referentsToParsedCsv,
    servicesToParsedCsv,
} from "../objectsToCsv";
import {
    csvSoftwaresPath,
    csvReferentsPath,
    csvServicesPath,
    jsonSoftwaresFilePath,
    jsonReferentsFilePath,
    jsonServicesPath,
} from "./generate-json";
import type { Service, Referent, Software } from "../types";
import * as fs from "fs";

if (require.main === module) {
    const [softwares, referents, services] = (
        [
            jsonSoftwaresFilePath,
            jsonReferentsFilePath,
            jsonServicesPath,
        ] as const
    ).map(path => JSON.parse(fs.readFileSync(path).toString("utf8"))) as [
        Software[],
        Referent[],
        Service[],
    ];

    for (const [path, data] of [
        [csvSoftwaresPath, softwaresToParsedCsv({ softwares })],
        [csvReferentsPath, referentsToParsedCsv({ softwares, referents })],
        [csvServicesPath, servicesToParsedCsv({ services, softwares })],
    ] as const) {
        fs.writeFileSync(path, Buffer.from(stringifyParsedCsv(data)));
    }
}
