import type { Db, WikidataEntry, Os, SoftwareType } from "../../core/ports/DbApi";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { z } from "zod";
import { id as tsafeId } from "tsafe/id";
import type { OptionalIfCanBeUndefined } from "../../tools/OptionalIfCanBeUndefined";
import { zSoftwareRow as zOldSoftwareRow } from "./old_model/z";
import type {
    SoftwareRow as OldSoftwareRow,
    SoftwareReferentRow as OldSoftwareReferentRow,
    SoftwareRef
} from "./old_model/typesx";
import { getWikidataSoftware } from "../../core/adapters/getWikidataSoftware";
import { getWikidataSoftwareOptions } from "../../core/adapters/getWikidataSoftwareOptions";
import { createResolveLocalizedString } from "i18nifty/LocalizedString";
import { exclude } from "tsafe/exclude";
import * as runExclusive from "run-exclusive";

/*
npm -g install ts-node
cd ~/github/sill/sill-data
ts-node --skipProject ../sill-api/src/scripts/migration/software.ts
*/

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

const softwareRefToWikidataEntry = runExclusive.build(
    async (softwareRef: SoftwareRef): Promise<WikidataEntry | undefined> => {
        if (!softwareRef.isKnown) {
            const options = await getWikidataSoftwareOptions({
                "queryString": softwareRef.softwareName,
                "language": "fr"
            });

            if (options.length === 0) {
                return undefined;
            }

            const option = options[0];

            console.log("Pick option", option, "for", softwareRef.softwareName);

            const out = {
                "wikidataId": option.id,
                "wikidataDescription": option.description,
                "wikidataLabel": option.label
            };

            return out;
        }

        const oldSoftwareRow = oldSoftwareRows.find(row => row.id === softwareRef.softwareId);

        assert(oldSoftwareRow !== undefined);

        const wikidataId = oldSoftwareRow.wikidataId;

        if (wikidataId === undefined) {
            return undefined;
        }

        const wikidataSoftware = await getWikidataSoftware({ "wikidataId": wikidataId });

        assert(wikidataSoftware !== undefined);

        if (wikidataSoftware.description === undefined || wikidataSoftware.label === undefined) {
            console.log("....we are here");
            return undefined;
        }

        const { resolveLocalizedString } = createResolveLocalizedString({
            "currentLanguage": "fr",
            "fallbackLanguage": "fr"
        });

        return {
            wikidataId,
            "wikidataDescription": resolveLocalizedString(wikidataSoftware.description),
            "wikidataLabel": resolveLocalizedString(wikidataSoftware.label)
        };
    }
);

const oldSoftwareRows = JSON.parse(
    fs.readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "software.json")).toString("utf8")
) as OldSoftwareRow[];
const oldSoftwareReferentRows = JSON.parse(
    fs.readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "softwareReferent.json")).toString("utf8")
) as OldSoftwareReferentRow[];

(async () => {
    fs.writeFileSync(
        pathJoin(process.cwd(), "software.json"),
        Buffer.from(
            JSON.stringify(
                await Promise.all(
                    JSON.parse(
                        fs
                            .readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "software.json"))
                            .toString("utf8")
                    ).map(async (oldSoftwareRow: OldSoftwareRow) => {
                        try {
                            zOldSoftwareRow.parse(oldSoftwareRow);
                        } catch (exception) {
                            console.log(oldSoftwareRow);

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
                            generalInfoMd,
                            ...rest
                        } = oldSoftwareRow;

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
                            "description": fun,
                            referencedSinceTime,
                            dereferencing,
                            isStillInObservation,
                            "parentSoftware":
                                parentSoftware === undefined
                                    ? undefined
                                    : await softwareRefToWikidataEntry(parentSoftware),
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
                            "updateTime": referencedSinceTime,
                            "doRespectRgaa": false,
                            "similarSoftwares":
                                alikeSoftwares === undefined
                                    ? []
                                    : (await Promise.all(alikeSoftwares.map(softwareRefToWikidataEntry))).filter(
                                          exclude(undefined)
                                      ),
                            "softwareType": agentWorkstation
                                ? {
                                      "type": "desktop",
                                      "os": {
                                          "linux": true,
                                          "mac": true,
                                          "windows": true
                                      }
                                  }
                                : {
                                      "type": "stack"
                                  },
                            "categories": tags ?? [],
                            "addedByAgentEmail": (() => {
                                const row = oldSoftwareReferentRows.find(row => row.softwareId === id);

                                if (row === undefined) {
                                    return "joseph.garrone@data.gouv.fr";
                                }

                                return row.referentEmail;
                            })()
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
