import { git } from "../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import { compiledDataJsonRelativeFilePath } from "../bin/build-data";
import { CompiledData } from "../model/types";
import { URL } from "url";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";

export function fetchCompiledData(params: {
    dataRepoUrl: string;
    buildBranch: string;
    githubPersonalAccessToken: string;
}): Promise<CompiledData<"with referents">> {
    const { dataRepoUrl, buildBranch, githubPersonalAccessToken } = params;

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
                        .readFileSync(compiledDataJsonRelativeFilePath)
                        .toString("utf8"),
                ),
            );

            return { "doCommit": false };
        },
    });

    return dOut.pr;
}
