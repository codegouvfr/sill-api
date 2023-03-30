import type { Db } from "../../core/ports/DbApi";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { id as tsafeId } from "tsafe/id";
import { z } from "zod";

/*
npm -g install ts-node
cd ~/github/sill/sill-data
ts-node --skipProject ../sill-api/src/scripts/migration/software.ts
*/

export type OldSoftwareReferentRow = {
    softwareId: number;
    referentEmail: string;
    isExpert: boolean;
    useCaseDescription: string;
    isPersonalUse: boolean;
};

const zOldSoftwareReferentRow = z.object({
    "softwareId": z.number(),
    "referentEmail": z.string(),
    "isExpert": z.boolean(),
    "useCaseDescription": z.string(),
    "isPersonalUse": z.boolean()
});

{
    type Got = ReturnType<(typeof zOldSoftwareReferentRow)["parse"]>;
    type Expected = OldSoftwareReferentRow;

    assert<Equals<Got, Expected>>();
}

(async () => {
    fs.writeFileSync(
        pathJoin(process.cwd(), "softwareReferent.json"),
        Buffer.from(
            JSON.stringify(
                await Promise.all(
                    JSON.parse(
                        fs
                            .readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "softwareReferent.json"))
                            .toString("utf8")
                    ).map(async (oldSoftwareReferent: OldSoftwareReferentRow) => {
                        try {
                            zOldSoftwareReferentRow.parse(oldSoftwareReferent);
                        } catch (exception) {
                            console.log(oldSoftwareReferent);

                            throw exception;
                        }

                        const { isExpert, isPersonalUse, referentEmail, softwareId, useCaseDescription, ...rest } =
                            oldSoftwareReferent;

                        // eslint-disable-next-line @typescript-eslint/ban-types
                        assert<Equals<typeof rest, {}>>();

                        try {
                            assert(Object.keys(rest).length === 0);
                        } catch (error) {
                            console.log(rest);

                            throw error;
                        }

                        return tsafeId<Db.SoftwareReferentRow>({
                            softwareId,
                            "agentEmail": referentEmail,
                            isExpert,
                            useCaseDescription,
                            "serviceUrl": undefined
                        });
                    })
                ),
                null,
                2
            ),
            "utf8"
        )
    );
})();
