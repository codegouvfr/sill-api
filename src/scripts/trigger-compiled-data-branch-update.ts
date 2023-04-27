import { createCoreApi } from "../core";
import { assert } from "tsafe/assert";

const sshPrivateKeyName = process.env["SSH_PRIVATE_KEY_FOR_GIT_NAME"];

assert(sshPrivateKeyName !== undefined);

const sshPrivateKey = process.env["SSH_PRIVATE_KEY_FOR_GIT"];

assert(sshPrivateKey !== undefined);

const githubPersonalAccessTokenForApiRateLimit = process.env["GITHUB_TOKEN"];

assert(githubPersonalAccessTokenForApiRateLimit !== undefined);

(async () => {
    const coreApi = await createCoreApi({
        "keycloakUserApiParams": undefined,
        "gitDbApiParams": {
            "dataRepoSshUrl": "git@github.com:codegouvfr/sill-data.git",
            sshPrivateKey,
            sshPrivateKeyName
        },
        githubPersonalAccessTokenForApiRateLimit,
        "doPerformPeriodicalUpdate": false
    });

    await coreApi.functions.readWriteSillData.manuallyTriggerNonIncrementalCompilation();

    process.exit(0);
})();
