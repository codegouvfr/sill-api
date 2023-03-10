import { z } from "zod";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import type { SoftwareRow, Language, LocalizedString, WikidataEntry, Os, SoftwareType } from "./types";

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

export const zOs = z.enum(["windows", "linux", "mac"]);

{
    type Got = ReturnType<(typeof zOs)["parse"]>;
    type Expected = Os;

    assert<Equals<Got, Expected>>();
}

export const zSoftwareType = z.union([
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

export const zSoftwareRow = z.object({
    "id": z.number(),
    "name": z.string(),
    "function": z.string(),
    "referencedSinceTime": z.number(),
    "dereferencing": z
        .object({
            "reason": z.string().optional(),
            "time": z.number(),
            "lastRecommendedVersion": z.string().optional()
        })
        .optional(),
    "isStillInObservation": z.boolean(),
    "parentSoftware": zWikidataEntry.optional(),
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
    "agentWorkstation": z.boolean(),
    "categories": z.array(z.string()),
    "generalInfoMd": z.string().optional()
});

{
    type Got = ReturnType<(typeof zSoftwareRow)["parse"]>;
    type Expected = SoftwareRow;

    assert<Equals<Got, Expected>>();
}

const zLanguage = z.union([z.literal("en"), z.literal("fr")]);

{
    type Got = ReturnType<(typeof zLanguage)["parse"]>;
    type Expected = Language;

    assert<Equals<Got, Expected>>();
}

export const zLocalizedString = z.union([z.string(), z.record(zLanguage, z.string())]);

{
    type Got = ReturnType<(typeof zLocalizedString)["parse"]>;
    type Expected = LocalizedString;

    assert<Equals<Got, Expected>>();
}
