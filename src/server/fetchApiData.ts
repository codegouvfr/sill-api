import { gitCommit } from "./tools/gitCommit";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import { relative as pathRelative } from "path";
import { dataDirPath, jsonApiFilePath } from "../bin/generate-json";
import type { Api } from "../model/types";

export function fetchApiData(params: {
    githubPersonalAccessToken: string;
}): Promise<Api> {
    const { githubPersonalAccessToken } = params;

    const dApiData = new Deferred<Api>();

    gitCommit({
        "owner": "etalab",
        "repo": "sill-referents",
        "shaish": "archive",
        "github_token": githubPersonalAccessToken,
        "performChanges": async () => {
            dApiData.resolve(
                JSON.parse(
                    fs
                        .readFileSync(
                            pathRelative(dataDirPath, jsonApiFilePath),
                        )
                        .toString("utf8"),
                ),
            );

            return { "doCommit": false };
        },
    });

    return dApiData.pr;
}
