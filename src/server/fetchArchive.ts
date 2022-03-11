import { git } from "../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import { relative as pathRelative } from "path";
import { dataDirPath, softwareJsonFilePath } from "../bin/generate-json";
import type { Software } from "../model/types";
import { URL } from "url";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";

export function fetchArchive(params: {
    archiveRepoUrl: string;
    archiveRepoBranch: string;
    githubPersonalAccessToken: string;
}): Promise<Software[]> {
    const { archiveRepoUrl, archiveRepoBranch, githubPersonalAccessToken } =
        params;

    const dApiData = new Deferred<Software[]>();

    const { owner, repo } = (() => {
        const { host, pathname } = new URL(archiveRepoUrl);

        assert(
            host === "github.com",
            `${symToStr({
                archiveRepoUrl,
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
        "shaish": archiveRepoBranch,
        "github_token": githubPersonalAccessToken,
        "action": async () => {
            dApiData.resolve(
                JSON.parse(
                    fs
                        .readFileSync(
                            pathRelative(dataDirPath, softwareJsonFilePath),
                        )
                        .toString("utf8"),
                ),
            );

            return { "doCommit": false };
        },
    });

    return dApiData.pr;
}
