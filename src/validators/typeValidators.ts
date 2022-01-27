import { assert } from "tsafe/assert";
import { is } from "tsafe/is";
import type { Software, SoftwareRef, Referent } from "../types";
import { recommendationStatuses, mimGroups } from "../types";
import { id } from "tsafe/id";

export function matchSoftwareRef(obj: any): obj is SoftwareRef {
    assert(is<SoftwareRef>(obj));

    try {
        assert(
            (obj.isKnown === true && typeof obj.softwareId === "number") ||
                (obj.isKnown === false && typeof obj.softwareName === "string"),
        );
    } catch {
        return false;
    }

    return true;
}

export function matchSoftware(obj: any): obj is Software {
    assert(is<Software>(obj));

    try {
        assert(
            id<number[]>([obj._id, obj.__referencedSinceTime])
                .map(value => typeof value === "number" && !isNaN(value))
                .every(b => b) &&
                id<string[]>([obj._name, obj._function, obj.__versionMin, obj._license])
                    .map(value => typeof value === "string")
                    .every(b => b) &&
                id<boolean[]>([obj.isFromFrenchPublicService, obj.isPresentInSupportContract])
                    .map(value => typeof value === "boolean")
                    .every(b => b) &&
                id<(string | undefined)[]>([
                    obj.wikidataId,
                    obj.whereAndInWhatContextIsItUsed,
                    obj.catalogNumeriqueGouvFrId,
                    obj.versionMax,
                ])
                    .map(value => value === undefined || typeof value === "string")
                    .every(b => b) &&
                id<(number | undefined)[]>([obj.comptoirDuLibreOrgId, obj.referentId])
                    .map(value => value === undefined || (typeof value === "number" && !isNaN(value)))
                    .every(b => b) &&
                recommendationStatuses.includes(obj.recommendationStatus) &&
                mimGroups.includes(obj.mimGroup),
        );
    } catch {
        return false;
    }

    return true;
}

export function matchReferent(obj: any): obj is Referent {
    assert(is<Referent>(obj));

    try {
        const emailRegexp = /^[^@]+@[^@]+$/;

        assert(
            typeof obj.id === "number" &&
                emailRegexp.test(obj.email) &&
                (obj.emailAlt === undefined || emailRegexp.test(obj.emailAlt)),
        );
    } catch {
        return false;
    }

    return true;
}
