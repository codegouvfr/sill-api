import type { Db } from "../../core/ports/DbApi";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { assert } from "tsafe/assert";
import { Equals, exclude } from "tsafe";
import { id as tsafeId } from "tsafe/id";
import { z } from "zod";

/*
npm -g install ts-node
cd ~/github/sill/sill-data
ts-node --skipProject ../sill-api/src/scripts/migration/software.ts
*/

export type OldServiceRow = OldServiceRow.KnownSoftware | OldServiceRow.UnknownSoftware;

export namespace OldServiceRow {
    export type Common = {
        id: number;
        agencyName: string;
        publicSector: string;
        agencyUrl: string;
        serviceName: string;
        serviceUrl: string;
        description: string;
        //"2018" | "2019" | "2020" | "2021" | "2022";
        publicationDate: string;
        lastUpdateDate: string;
        signupScope: string;
        usageScope: string;
        signupValidationMethod: string;
        contentModerationMethod: string;
    };

    export type KnownSoftware = Common & {
        softwareSillId: number;
    };

    export type UnknownSoftware = Common & {
        softwareSillId?: undefined;
        softwareName: string;
        comptoirDuLibreId?: number;
    };
}

const zOldServiceRow = z.intersection(
    z.object({
        "id": z.number(),
        "agencyName": z.string(),
        "publicSector": z.string(),
        "agencyUrl": z.string(),
        "serviceName": z.string(),
        "serviceUrl": z.string(),
        "description": z.string(),
        "publicationDate": z.string(),
        "lastUpdateDate": z.string(),
        "signupScope": z.string(),
        "usageScope": z.string(),
        "signupValidationMethod": z.string(),
        "contentModerationMethod": z.string()
    }),
    z.union([
        z.object({
            "softwareSillId": z.number()
        }),
        z.object({
            "softwareSillId": z.literal(undefined).optional(),
            "softwareName": z.string(),
            "comptoirDuLibreId": z.number().optional()
        })
    ])
);

{
    type Got = ReturnType<(typeof zOldServiceRow)["parse"]>;
    type Expected = OldServiceRow;

    assert<Equals<Got, Expected>>();
}

(async () => {
    fs.writeFileSync(
        pathJoin(process.cwd(), "instance.json"),
        Buffer.from(
            JSON.stringify(
                (
                    await Promise.all(
                        JSON.parse(
                            fs
                                .readFileSync(pathJoin(process.cwd(), "..", "sill-data-legacy", "service.json"))
                                .toString("utf8")
                        ).map(async (oldServiceRow: OldServiceRow) => {
                            try {
                                zOldServiceRow.parse(oldServiceRow);
                            } catch (exception) {
                                console.log(oldServiceRow);

                                throw exception;
                            }

                            const {
                                id,
                                agencyName,
                                //publicSector,
                                //agencyUrl,
                                //serviceName,
                                serviceUrl,
                                //description,
                                //publicationDate,
                                //lastUpdateDate,
                                //signupScope,
                                usageScope,
                                //signupValidationMethod,
                                //contentModerationMethod,
                                softwareSillId
                            } = oldServiceRow;

                            if (softwareSillId === undefined) {
                                return undefined;
                            }

                            const now = Date.now();

                            return tsafeId<Db.InstanceRow>({
                                "id": id,
                                "mainSoftwareSillId": softwareSillId,
                                "organization": agencyName,
                                "targetAudience": usageScope,
                                "publicUrl": serviceUrl,
                                "otherSoftwares": [],
                                "addedByAgentEmail": "joseph.garrone@data.gouv.fr",
                                "referencedSinceTime": now,
                                "updateTime": now
                            });
                        })
                    )
                ).filter(exclude(undefined)),
                null,
                2
            ),
            "utf8"
        )
    );
})();
