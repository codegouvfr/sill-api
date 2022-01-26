import { assert } from "tsafe/assert";
import { is } from "tsafe/is";
import { exclude } from "tsafe/exclude";
import type { Software, SoftwareRef } from "./types";
import { recommendationStatuses, licenses, mimGroups } from "./types";

export function isSoftwareRef(obj: any): obj is SoftwareRef {
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

export function isSoftware(obj: any): obj is Software {
    assert(is<Software>(obj));

    try {
        assert(
            [obj.id, obj.referencedSinceTime, obj.referentId]
                .map(value => typeof value === "number")
                .every(b => b) &&
                [obj.name, obj.function, obj.versionMin]
                    .map(value => typeof value === "string")
                    .every(b => b) &&
                [obj.isFromFrenchPublicService, obj.isPresentInSupportContract]
                    .map(value => typeof value === "boolean")
                    .every(b => b) &&
                [
                    obj.wikidataId,
                    obj.usageContext,
                    obj.comptoirDuLibreOrgId,
                    obj.catalogNumeriqueGouvFrId,
                    obj.versionMax,
                ]
                    .map(value => value === undefined || typeof value === "string")
                    .every(b => b) &&
                recommendationStatuses.includes(obj.recommendationStatus) &&
                licenses.includes(obj.license) &&
                mimGroups.includes(obj.mimGroup),
        );
    } catch {
        return false;
    }

    return true;
}

export function isSoftwareRefValidReference(params: {
    softwareRef: SoftwareRef.Known;
    softwares: Software[];
}) {
    const { softwareRef, softwares } = params;

    const software = softwares.find(({ id }) => softwareRef.softwareId === id);

    return software !== undefined;
}

export function validateThatSoftwareCanBeInserted(params: {
    software: Software;
    softwares: Software[];
}): void {
    const { software, softwares } = params;

    assert(
        softwares.find(({ id }) => id === software.id) === undefined,
        "There is already a software with this id",
    );

    software.alikeSoftwares
        .map(softwareRef => (softwareRef.isKnown ? softwareRef : undefined))
        .filter(exclude(undefined))
        .forEach(softwareRef =>
            assert(
                isSoftwareRefValidReference({ softwareRef, softwares }),
                `Alike software ${softwareRef.softwareId} is not not present in the software list`,
            ),
        );

    {
        const softwareRef = software.parentSoftware;

        if (softwareRef !== undefined && softwareRef.isKnown) {
            assert(
                isSoftwareRefValidReference({ softwareRef, softwares }),
                `Parent software ${softwareRef.softwareId} is not present in the software list`,
            );
        }
    }
}
