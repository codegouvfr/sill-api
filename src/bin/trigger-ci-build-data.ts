import { triggerComputationOfCompiledData } from "../server/adapter/createGitHubDataApi";
import { assert } from "tsafe/assert";

const envVarName = "GITHUB_TOKEN";

const githubPersonalAccessToken = process.env[envVarName];

assert(
    githubPersonalAccessToken !== undefined,
    `${envVarName} env variable is required`,
);

for (const repo of ["", "-test"].map(suffix => `sill-data${suffix}`)) {
    triggerComputationOfCompiledData({
        "dataRepoUrl": `https://github.com/etalab/${repo}`,
        githubPersonalAccessToken,
    });
}

console.log(`https://github.com/etalab/sill-api/actions`);
