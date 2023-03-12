import { assert } from "tsafe/assert";
import { Octokit } from "@octokit/rest";

const envVarName = "GITHUB_TOKEN";

const githubPersonalAccessToken = process.env[envVarName];

assert(githubPersonalAccessToken !== undefined, `${envVarName} env variable is required`);

const octokit = new Octokit({
    "auth": githubPersonalAccessToken
});

octokit.rest.repos
    .createDispatchEvent({
        "owner": "codegouvfr",
        "repo": "sill-api",
        "event_type": "trigger-compile-data",
        "client_payload": {
            "dataRepoSshUrl": "git@github.com:etalab/sill-data.git",
            "incremental": false
        }
    })
    .then(() => console.log(`https://github.com/etalab/sill-api/actions`));
