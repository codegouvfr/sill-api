import { z } from "zod";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import type { SoftwareRow, SoftwareRef } from "./typesx";
import type { Language, LocalizedString } from "./typesx";

export const zSoftwareRef = z.union([
    z.object({
        "isKnown": z.literal(true),
        "softwareId": z.number()
    }),
    z.object({
        "isKnown": z.literal(false),
        "softwareName": z.string()
    })
]);

{
    type Got = ReturnType<(typeof zSoftwareRef)["parse"]>;
    type Expected = SoftwareRef;

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
    "parentSoftware": zSoftwareRef.optional(),
    "isFromFrenchPublicService": z.boolean(),
    "isPresentInSupportContract": z.boolean(),
    "alikeSoftwares": z.array(zSoftwareRef).optional(),
    "wikidataId": z.string().optional(),
    "comptoirDuLibreId": z.number().optional(),
    "license": z.string(),
    "contextOfUse": z.string().optional(),
    "catalogNumeriqueGouvFrId": z.string().optional(),
    "mimGroup": z.union([z.literal("MIMO"), z.literal("MIMDEV"), z.literal("MIMPROD"), z.literal("MIMDEVOPS")]),
    "versionMin": z.string(),
    "workshopUrls": z.array(z.string()),
    "testUrls": z.array(
        z.object({
            "description": z.string(),
            "url": z.string()
        })
    ),
    "useCaseUrls": z.array(z.string()),
    "agentWorkstation": z.boolean(),
    "tags": z.array(z.string()).optional(),
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
