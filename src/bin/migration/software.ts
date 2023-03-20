import type { Db, WikidataEntry, Os, SoftwareType } from "../../core/ports/DbApi";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { z } from "zod";
import { id as tsafeId } from "tsafe/id";
import type { OptionalIfCanBeUndefined } from "../../tools/OptionalIfCanBeUndefined";

export const zWikidataEntry = z.object({
    "wikidataLabel": z.string(),
    "wikidataDescription": z.string(),
    "wikidataId": z.string()
});

{
    type Got = ReturnType<(typeof zWikidataEntry)["parse"]>;
    type Expected = WikidataEntry;

    assert<Equals<Got, Expected>>();
}

const zOs = z.enum(["windows", "linux", "mac"]);

{
    type Got = ReturnType<(typeof zOs)["parse"]>;
    type Expected = Os;

    assert<Equals<Got, Expected>>();
}

const zSoftwareType = z.union([
    z.object({
        "type": z.literal("desktop"),
        "os": z.object({
            "windows": z.boolean(),
            "linux": z.boolean(),
            "mac": z.boolean()
        })
    }),
    z.object({
        "type": z.literal("cloud")
    }),
    z.object({
        "type": z.literal("stack")
    })
]);

{
    type Got = ReturnType<(typeof zSoftwareType)["parse"]>;
    type Expected = SoftwareType;

    assert<Equals<Got, Expected>>();
}

const zSoftwareRow = z.object({
    "id": z.number(),
    "name": z.string(),
    "description": z.string(),
    "referencedSinceTime": z.number(),
    "updateTime": z.number(),
    "dereferencing": z
        .object({
            "reason": z.string().optional(),
            "time": z.number(),
            "lastRecommendedVersion": z.string().optional()
        })
        .optional(),
    "isStillInObservation": z.boolean(),
    "parentSoftware": zWikidataEntry.optional(),
    "doRespectRgaa": z.boolean(),
    "isFromFrenchPublicService": z.boolean(),
    "isPresentInSupportContract": z.boolean(),
    "similarSoftwares": z.array(zWikidataEntry),
    "wikidataId": z.string().optional(),
    "comptoirDuLibreId": z.number().optional(),
    "license": z.string(),
    "softwareType": zSoftwareType,
    "catalogNumeriqueGouvFrId": z.string().optional(),
    "versionMin": z.string(),
    "workshopUrls": z.array(z.string()),
    "testUrls": z.array(
        z.object({
            "description": z.string(),
            "url": z.string()
        })
    ),
    "categories": z.array(z.string()),
    "generalInfoMd": z.string().optional(),
    "addedByAgentEmail": z.string()
});

{
    type Got = ReturnType<(typeof zSoftwareRow)["parse"]>;
    type Expected = OptionalIfCanBeUndefined<Db.SoftwareRow>;

    assert<Equals<Got, Expected>>();
}

const softwareFilePath = pathJoin(process.cwd(), "software.json");

fs.writeFileSync(
    softwareFilePath,
    Buffer.from(
        JSON.stringify(
            JSON.parse(fs.readFileSync(softwareFilePath).toString("utf8")).map((softwareRow: Db.SoftwareRow) => {
                try {
                    zSoftwareRow.parse(softwareRow);
                } catch (exception) {
                    console.log(softwareRow);

                    throw exception;
                }

                const {
                    id,
                    name,
                    description,
                    referencedSinceTime,
                    dereferencing,
                    isStillInObservation,
                    parentSoftware,
                    isFromFrenchPublicService,
                    isPresentInSupportContract,
                    wikidataId,
                    comptoirDuLibreId,
                    license,
                    catalogNumeriqueGouvFrId,
                    versionMin,
                    workshopUrls,
                    testUrls,
                    generalInfoMd,
                    updateTime,
                    doRespectRgaa,
                    similarSoftwares,
                    softwareType,
                    categories,
                    addedByAgentEmail,
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

                return tsafeId<Db.SoftwareRow>({
                    id,
                    name,
                    description,
                    referencedSinceTime,
                    dereferencing,
                    isStillInObservation,
                    parentSoftware,
                    isFromFrenchPublicService,
                    isPresentInSupportContract,
                    wikidataId,
                    comptoirDuLibreId,
                    license,
                    catalogNumeriqueGouvFrId,
                    versionMin,
                    workshopUrls,
                    testUrls,
                    generalInfoMd,
                    updateTime,
                    doRespectRgaa,
                    similarSoftwares,
                    softwareType,
                    categories,
                    addedByAgentEmail
                });
            }),
            null,
            2
        ),
        "utf8"
    )
);
