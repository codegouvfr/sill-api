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

type OldReferentRow = {
    email: string;
    familyName: string;
    firstName: string;
    agencyName: string;
};

const zOldReferentRow = z.object({
    email: z.string(),
    familyName: z.string(),
    firstName: z.string(),
    agencyName: z.string()
});

{
    type Got = ReturnType<(typeof zOldReferentRow)["parse"]>;
    type Expected = OldReferentRow;

    assert<Equals<Got, Expected>>();
}

(async () => {
    fs.writeFileSync(
        pathJoin(process.cwd(), "agent.json"),
        Buffer.from(
            JSON.stringify(
                await Promise.all(
                    JSON.parse(
                        fs
                            .readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "referent.json"))
                            .toString("utf8")
                    ).map(async (oldReferentRow: OldReferentRow) => {
                        try {
                            zOldReferentRow.parse(oldReferentRow);
                        } catch (exception) {
                            console.log(oldReferentRow);

                            throw exception;
                        }

                        const { email, agencyName, familyName, firstName, ...rest } = oldReferentRow;

                        // eslint-disable-next-line @typescript-eslint/ban-types
                        assert<Equals<typeof rest, {}>>();

                        try {
                            assert(Object.keys(rest).length === 0);
                        } catch (error) {
                            console.log(rest);

                            throw error;
                        }

                        return tsafeId<Db.AgentRow>({
                            email,
                            "organization": agencyName
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
