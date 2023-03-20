import type { Db } from "../../core/ports/DbApi";
import { z } from "zod";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { zWikidataEntry } from "../../rpc/router";
import { id as tsafeId } from "tsafe/id";

const instanceFilePath = pathJoin(process.cwd(), "instance.json");

const zInstanceRow = z.object({
    "id": z.number(),
    "mainSoftwareSillId": z.number(),
    "organization": z.string(),
    "targetAudience": z.string(),
    "publicUrl": z.string(),
    "otherSoftwares": z.array(zWikidataEntry),
    "addedByAgentEmail": z.string()
});

type Got = ReturnType<(typeof zInstanceRow)["parse"]>;
type Expected = Db.InstanceRow;

assert<Equals<Got, Expected>>();

fs.writeFileSync(
    instanceFilePath,
    Buffer.from(
        JSON.stringify(
            JSON.parse(fs.readFileSync(instanceFilePath).toString("utf8")).map((instanceRow: Db.InstanceRow) => {
                try {
                    zInstanceRow.parse(instanceRow);
                } catch (exception) {
                    console.log(instanceRow);

                    throw exception;
                }

                const {
                    id,
                    mainSoftwareSillId,
                    organization,
                    otherSoftwares,
                    publicUrl,
                    targetAudience,
                    addedByAgentEmail,
                    ...rest
                } = instanceRow;

                assert<Equals<typeof rest, {}>>();

                return tsafeId<Db.InstanceRow>({
                    id,
                    mainSoftwareSillId,
                    organization,
                    otherSoftwares,
                    publicUrl,
                    targetAudience,
                    addedByAgentEmail
                });
            }),
            null,
            2
        ),
        "utf8"
    )
);
