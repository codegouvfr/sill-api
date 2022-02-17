import { git } from "../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import { relative as pathRelative } from "path";
import { dataDirPath, sillFilePath } from "../bin/generate-json";
import type { SoftwareX } from "../model/types";

export function fetchSoftware(params: {
    githubPersonalAccessToken: string;
}): Promise<SoftwareX[]> {
    const { githubPersonalAccessToken } = params;

    const dApiData = new Deferred<SoftwareX[]>();

    git({
        "owner": "etalab",
        "repo": "sill-referents",
        "shaish": "archive",
        "github_token": githubPersonalAccessToken,
        "action": async () => {
            dApiData.resolve(
                JSON.parse(
                    fs
                        .readFileSync(pathRelative(dataDirPath, sillFilePath))
                        .toString("utf8"),
                ),
            );

            return { "doCommit": false };
        },
    });

    return dApiData.pr;
}
