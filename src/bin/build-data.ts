import { buildCatalog } from "../model/buildCatalog";
import { join as pathJoin, basename as pathBasename } from "path";
import type { CompiledData } from "../model/types";
import { removeReferent } from "../model/types";
import * as fs from "fs";
import * as child_process from "child_process";
import { assert } from "tsafe/assert";
import { fetchCompiledData } from "../server/adapter/createGitHubDataApi";
import { ErrorNoBranch } from "../tools/git";

export const softwareJsonRelativeFilePath = "software.json";
export const referentJsonRelativeFilePath = "referent.json";
export const softwareReferentJsonRelativeFilePath = "softwareReferent.json";
export const serviceJsonRelativeFilePath = "service.json";

export const compiledDataJsonRelativeFilePath = "compiledData.json";

if (require.main === module) {
    (async () => {
        const projectDirPath = pathJoin(__dirname, "..", "..");
        const dataDirPath = pathJoin(projectDirPath, "data");
        const buildDirPath = pathJoin(dataDirPath, "build");
        const compiledDataWithoutReferentJsonRelativeFilePath =
            "compiledData_withoutReferents.json";

        const envName = "GITHUB_TOKEN";

        const githubToken = process.env[envName];

        assert(
            !!githubToken,
            `The environnement variable ${envName} is required to being able to clone the data repo`,
        );

        const repository = process.argv[2];

        assert(
            repository !== undefined,
            `First cli parameter is expected and should be the data repository ( example: node ${pathBasename(
                __filename,
            )} etalab/sill-data`,
        );

        const incremental = (() => {
            switch (process.argv[3]?.match(/^incremental=(.*)$/)?.[1]) {
                case "true":
                    return true;
                case "false":
                    return false;
                default:
                    assert(
                        false,
                        `Second cli parameter should be incremental=true or incremental=false`,
                    );
            }
        })();

        child_process.execSync(
            `git clone --depth 1 https://${githubToken}@github.com/${repository} ${dataDirPath}`,
        );

        const { compiledData } = await (async () => {
            const read = (relativeFilePath: string) =>
                JSON.parse(
                    fs
                        .readFileSync(pathJoin(dataDirPath, relativeFilePath))
                        .toString("utf8"),
                );

            const { catalog } = await buildCatalog({
                "softwareRows": read(softwareJsonRelativeFilePath),
                "referentRows": read(referentJsonRelativeFilePath),
                "softwareReferentRows": read(
                    softwareReferentJsonRelativeFilePath,
                ),
                "currentCatalog": incremental
                    ? await fetchCompiledData({
                          "dataRepoUrl": `https://github.com/${repository}`,
                          "githubPersonalAccessToken": githubToken,
                      }).then(
                          ({ catalog }) => catalog,
                          error =>
                              error instanceof ErrorNoBranch
                                  ? (console.log(
                                        "There is no build branch yet",
                                    ),
                                    undefined)
                                  : error,
                      )
                    : undefined,
                "log": console.log,
            });

            const compiledData: CompiledData<"with referents"> = {
                catalog,
                "services": read(serviceJsonRelativeFilePath),
            };

            return { compiledData };
        })();

        const compiledData_withoutReferents: CompiledData<"without referents"> =
            {
                ...compiledData,
                "catalog": compiledData.catalog.map(removeReferent),
            };

        if (!fs.existsSync(buildDirPath)) {
            fs.mkdirSync(buildDirPath);
        }

        for (const [relativeJsonFilePath, data] of [
            [compiledDataJsonRelativeFilePath, compiledData],
            [
                compiledDataWithoutReferentJsonRelativeFilePath,
                compiledData_withoutReferents,
            ],
        ] as const) {
            fs.writeFileSync(
                pathJoin(buildDirPath, relativeJsonFilePath),
                Buffer.from(JSON.stringify(data, null, 2), "utf8"),
            );
        }
    })();
}
