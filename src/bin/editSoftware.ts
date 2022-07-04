import type { SoftwareRow } from "../model/types";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { zSoftwareRow } from "../model/z";
/*
import { exclude } from "tsafe/exclude";
import { rawCsvFileToRawCsvRows } from "../tools/stringifyCsv";
*/

/*

This script is meant to help edit and make sure it is well formatted sill-data/software.json

cd ~/github/sill-api && npx tsc -w
cd ~/github/sill-data 
wget https://git.sr.ht/~etalab/sill/blob/master/sill.csv
node ../sill-api/dist/bin/edit.js

*/

/*
const rawCsvRows = rawCsvFileToRawCsvRows({ "rawCsvFile": fs.readFileSync(
    pathJoin(process.cwd(), "sill.csv")
).toString("utf8") });
*/

const softwareFilePath = pathJoin(process.cwd(), "software.json");

fs.writeFileSync(
    softwareFilePath,
    Buffer.from(
        JSON.stringify(
            JSON.parse(fs.readFileSync(softwareFilePath).toString("utf8")).map(
                (softwareRow: SoftwareRow) => {
                    try {
                        zSoftwareRow.parse(softwareRow);
                    } catch (exception) {
                        console.log(softwareRow);

                        throw exception;
                    }

                    const {
                        id,
                        name,
                        "function": fun,
                        referencedSinceTime,
                        dereferencing,
                        isStillInObservation,
                        parentSoftware,
                        isFromFrenchPublicService,
                        isPresentInSupportContract,
                        alikeSoftwares,
                        wikidataId,
                        comptoirDuLibreId,
                        license,
                        contextOfUse,
                        catalogNumeriqueGouvFrId,
                        mimGroup,
                        versionMin,
                        workshopUrls,
                        testUrls,
                        useCaseUrls,
                        agentWorkstation,
                        tags,
                        ...rest
                    } = softwareRow;

                    // eslint-disable-next-line @typescript-eslint/ban-types
                    assert<Equals<typeof rest, {}>>();

                    try {
                        assert(Object.keys(rest).length === 0);
                    } catch (error) {
                        console.log(rest);

                        throw error;
                    }

                    return {
                        id,
                        name,
                        "function": fun,
                        referencedSinceTime,
                        dereferencing,
                        isStillInObservation,
                        parentSoftware,
                        isFromFrenchPublicService,
                        isPresentInSupportContract,
                        alikeSoftwares,
                        wikidataId,
                        comptoirDuLibreId,
                        license,
                        contextOfUse,
                        catalogNumeriqueGouvFrId,
                        mimGroup,
                        versionMin,
                        workshopUrls,
                        testUrls,
                        //"useCaseUrls": [rawCsvRows.find(row => row["ID"] === `${id}`)?.["fiche"] || undefined].filter(exclude(undefined)) ,
                        useCaseUrls,
                        agentWorkstation,
                        tags,
                    };
                },
            ),
            null,
            2,
        ),
        "utf8",
    ),
);
