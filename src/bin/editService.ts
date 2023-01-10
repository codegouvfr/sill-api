import type { ServiceRow } from "../model/types";
import { z } from "zod";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
/*
import { exclude } from "tsafe/exclude";
import { rawCsvFileToRawCsvRows } from "../tools/stringifyCsv";
*/

/*

This script is meant to help edit and make sure it is well formatted sill-data/software.json

cd ~/github/sill-api && npx tsc -w
cd ~/github/sill-data 
wget https://git.sr.ht/~etalab/sill/blob/master/papillon.csv
node ../sill-api/dist/bin/editService.js

*/

/*
const rawCsvRows = rawCsvFileToRawCsvRows({ "rawCsvFile": fs.readFileSync(
    pathJoin(process.cwd(), "papillon.csv")
).toString("utf8") });
*/

const serviceFilePath = pathJoin(process.cwd(), "service.json");

const zServiceRow = z.intersection(
    z.object({
        "id": z.number(),
        "agencyName": z.string(),
        "publicSector": z.string(),
        "agencyUrl": z.string(),
        "serviceName": z.string(),
        "serviceUrl": z.string(),
        "description": z.string(),
        "publicationDate": z.string(),
        "lastUpdateDate": z.string(),
        "signupScope": z.string(),
        "usageScope": z.string(),
        "signupValidationMethod": z.string(),
        "contentModerationMethod": z.string()
    }),
    z.union([
        z.object({
            "softwareSillId": z.number()
        }),
        z.object({
            "softwareSillId": z.literal(undefined).optional(),
            "softwareName": z.string(),
            "comptoirDuLibreId": z.number().optional()
        })
    ])
);

type Got = ReturnType<(typeof zServiceRow)["parse"]>;
type Expected = ServiceRow;

assert<Equals<Got, Expected>>();

fs.writeFileSync(
    serviceFilePath,
    Buffer.from(
        JSON.stringify(
            JSON.parse(fs.readFileSync(serviceFilePath).toString("utf8")).map((serviceRow: ServiceRow) => {
                try {
                    zServiceRow.parse(serviceRow);
                } catch (exception) {
                    console.log(serviceRow);

                    throw exception;
                }

                const {
                    id,
                    agencyName,
                    publicSector,
                    agencyUrl,
                    serviceName,
                    serviceUrl,
                    description,
                    publicationDate,
                    lastUpdateDate,
                    signupScope,
                    usageScope,
                    signupValidationMethod,
                    contentModerationMethod,
                    ...rest
                } = serviceRow;

                return {
                    id,
                    agencyName,
                    publicSector,
                    agencyUrl,
                    serviceName,
                    serviceUrl,
                    description,
                    //"description": rawCsvRows.find(row => row["id"] === `${id}`)!["description"],
                    publicationDate,
                    lastUpdateDate,
                    signupScope,
                    usageScope,
                    signupValidationMethod,
                    contentModerationMethod,
                    ...(() => {
                        if ("softwareName" in rest) {
                            const { softwareSillId, softwareName, comptoirDuLibreId, ...rest2 } = rest;

                            try {
                                assert(Object.keys(rest2).length === 0);
                            } catch (error) {
                                console.log("===>", rest2);

                                throw error;
                            }

                            return {
                                softwareName,
                                comptoirDuLibreId
                            };
                        } else {
                            const { softwareSillId, ...rest2 } = rest;

                            try {
                                assert(Object.keys(rest2).length === 0);
                            } catch (error) {
                                console.log("!!!!", rest2);

                                throw error;
                            }

                            return {
                                softwareSillId
                            };
                        }
                    })()
                };
            }),
            null,
            2
        ),
        "utf8"
    )
);
