import { git } from "../tools/git";
import { Deferred } from "evt/tools/Deferred";
import {
    softwareJsonRelativeFilePath,
    referentJsonRelativeFilePath,
    softwareReferentJsonRelativeFilePath,
    serviceJsonRelativeFilePath,
} from "../bin/build-data";
import { URL } from "url";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";
import {
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../model/types";
import { readFileSync } from "fs";

export function fetchDb(params: {
    dataRepoUrl: string;
    githubPersonalAccessToken: string;
}) {
    const { dataRepoUrl, githubPersonalAccessToken } = params;

    const dOut = new Deferred<{
        softwareRows: SoftwareRow[];
        referentRows: ReferentRow[];
        softwareReferentRows: SoftwareReferentRow[];
        serviceRows: ServiceRow[];
    }>();

    const { owner, repo } = (() => {
        const { host, pathname } = new URL(dataRepoUrl);

        assert(
            host === "github.com",
            `${symToStr({
                dataRepoUrl,
            })} is expected to be a GitHub url (until we support other forges)`,
        );

        const [owner, repo] = pathname.replace(/^\//, "").split("/");

        assert(typeof owner === "string");
        assert(typeof repo === "string");

        return { owner, repo };
    })();

    git({
        owner,
        repo,
        "github_token": githubPersonalAccessToken,
        "action": async () => {
            const read = (relativeFilePath: string) =>
                JSON.parse(readFileSync(relativeFilePath).toString("utf8"));

            dOut.resolve({
                "softwareRows": read(softwareJsonRelativeFilePath),
                "referentRows": read(referentJsonRelativeFilePath),
                "softwareReferentRows": read(
                    softwareReferentJsonRelativeFilePath,
                ),
                "serviceRows": read(serviceJsonRelativeFilePath),
            });

            return { "doCommit": false };
        },
    });

    return dOut.pr;
}
