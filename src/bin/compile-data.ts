#!/usr/bin/env node

import { createCompileData } from "../core/adapters/compileData";
import { type CompiledData, removeReferent } from "../core/ports/CompileData";
import { getCnllPrestatairesSill } from "../core/adapters/getCnllPrestatairesSill";
import { getComptoirDuLibre } from "../core/adapters/getComptoirDuLibre";
import { getWikidataSoftware } from "../core/adapters/getWikidataSoftware";
import { buildBranch, compiledDataJsonRelativeFilePath, createGitDbApi } from "../core/adapters/createGitDbApi";
import { join as pathJoin } from "path";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import { ErrorNoBranch } from "../tools/gitSsh";
import { gitSsh } from "../tools/gitSsh";

const compileData = createCompileData({
    getCnllPrestatairesSill,
    getComptoirDuLibre,
    getWikidataSoftware
});

async function main(params: {
    dataRepoSshUrl: string;
    sshPrivateKeyName: string;
    sshPrivateKey: string;
    isIncremental: boolean;
}): Promise<void> {
    const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey, isIncremental } = params;

    const { fetchCompiledData, fetchDb } = createGitDbApi({
        dataRepoSshUrl,
        sshPrivateKey,
        sshPrivateKeyName
    });

    const { compiledData } = await (async () => {
        const db = await fetchDb();

        const currentCompiledData = isIncremental
            ? await fetchCompiledData().then(
                  ({ catalog }) => catalog,
                  (error: Error) =>
                      error instanceof ErrorNoBranch ? (console.log("There is no build branch yet"), undefined) : error
              )
            : undefined;

        if (currentCompiledData instanceof Error) {
            throw currentCompiledData;
        }

        const compiledData = await compileData({
            db,
            "wikidataCacheCache": currentCompiledData,
            "log": console.log
        });

        return { compiledData };
    })();

    const compiledData_withoutReferents: CompiledData<"without referents"> = {
        ...compiledData,
        "catalog": compiledData.catalog.map(removeReferent)
    };

    gitSsh({
        "sshUrl": dataRepoSshUrl,
        sshPrivateKeyName,
        sshPrivateKey,
        "shaish": buildBranch,
        "action": ({ repoPath }) => {
            for (const [relativeJsonFilePath, data] of [
                [compiledDataJsonRelativeFilePath, compiledData],
                [
                    `${compiledDataJsonRelativeFilePath.replace(/\.json$/, "")}_withoutReferents.json`,
                    compiledData_withoutReferents
                ]
            ] as const) {
                fs.writeFileSync(
                    pathJoin(repoPath, relativeJsonFilePath),
                    Buffer.from(JSON.stringify(data, null, 2), "utf8")
                );
            }

            return Promise.resolve({
                "doCommit": true,
                "doAddAll": true,
                "message": "Updating compiled data"
            });
        }
    });
}

if (require.main === module) {
    const dataRepoSshUrl = process.env["DATA_REPO_SSH_URL"];

    assert(dataRepoSshUrl !== undefined);

    const sshPrivateKeyName = process.env["SSH_PRIVATE_KEY_NAME"];

    assert(sshPrivateKeyName !== undefined);

    const sshPrivateKey = process.env["SSH_PRIVATE_KEY"];

    assert(sshPrivateKey !== undefined);

    const INCREMENTAL = process.env["INCREMENTAL"];

    assert(INCREMENTAL === "true" || INCREMENTAL === "false");

    main({
        dataRepoSshUrl,
        sshPrivateKeyName,
        sshPrivateKey,
        "isIncremental": INCREMENTAL === "true"
    });
}
