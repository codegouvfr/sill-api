import { triggerComputationOfCompiledData } from "../server/adapter/createGitHubDataApi";
import { assert } from "tsafe/assert";

const envVarName = "GITHUB_TOKEN";

const githubPersonalAccessToken = process.env[envVarName];

assert(
    githubPersonalAccessToken !== undefined,
    `${envVarName} env variable is required`,
);

triggerComputationOfCompiledData({
    "dataRepoUrl": `https://github.com/etalab/sill-data`,
    githubPersonalAccessToken,
});

console.log(`https://github.com/etalab/sill-api/actions`);
