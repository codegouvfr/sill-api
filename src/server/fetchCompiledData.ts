import { git } from "../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import type { compiledDataJsonRelativeFilePath } from "../bin/build-data";
import type { CompiledData } from "../model/types";
import { URL } from "url";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";
import { id } from "tsafe/id";

export const buildBranch = "build";

export function fetchCompiledData(params: {
    dataRepoUrl: string;
    githubPersonalAccessToken: string;
}): Promise<CompiledData<"with referents">> {
    const { dataRepoUrl, githubPersonalAccessToken } = params;

    const dOut = new Deferred<CompiledData<"with referents">>();

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
        "shaish": buildBranch,
        "github_token": githubPersonalAccessToken,
        "action": async () => {
            dOut.resolve(
                JSON.parse(
                    fs
                        .readFileSync(
                            id<typeof compiledDataJsonRelativeFilePath>(
                                "compiledData.json",
                            ),
                        )
                        .toString("utf8"),
                ),
            );

            return { "doCommit": false };
        },
    });

    return dOut.pr;
}
