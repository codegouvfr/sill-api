import type { SoftwareReferentRow } from "../model/types";
import { z } from "zod";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";

/*

This script is meant to help edit and make sure it is well formatted sill-data/software.json

cd ~/github/sill-api && npx tsc -w
cd ~/github/sill-data 
node ../sill-api/dist/bin/editSoftwareReferent.js

*/

const softwareReferentFilePath = pathJoin(process.cwd(), "softwareReferent.json");

const zSoftwareReferentRow = z.object({
    "softwareId": z.number(),
    "referentEmail": z.string(),
    "isExpert": z.boolean(),
    "useCaseDescription": z.string(),
    "isPersonalUse": z.boolean()
});

type Got = ReturnType<(typeof zSoftwareReferentRow)["parse"]>;
type Expected = SoftwareReferentRow;

assert<Equals<Got, Expected>>();

fs.writeFileSync(
    softwareReferentFilePath,
    Buffer.from(
        JSON.stringify(
            JSON.parse(fs.readFileSync(softwareReferentFilePath).toString("utf8")).map(
                (softwareReferentRow: SoftwareReferentRow) => {
                    /*
                try {
                    zSoftwareReferentRow.parse(softwareReferentRow);
                } catch (exception) {
                    console.log(softwareReferentRow);

                    throw exception;
                }
                */

                    const { softwareId, referentEmail, isExpert, useCaseDescription, isPersonalUse, ...rest } =
                        softwareReferentRow;

                    try {
                        assert(Object.keys(rest).length === 0);
                    } catch (error) {
                        console.log(rest);

                        throw error;
                    }

                    return {
                        softwareId,
                        referentEmail,
                        isExpert,
                        useCaseDescription,
                        "isPersonalUse": false
                    };
                }
            ),
            null,
            2
        ),
        "utf8"
    )
);
