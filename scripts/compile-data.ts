import { bootstrapCore } from "../src/core";
import { assert } from "tsafe/assert";

const sshPrivateKeyName = process.env["SILL_SSH_NAME"];

assert(sshPrivateKeyName !== undefined);

const sshPrivateKey = process.env["SILL_SSH_PRIVATE_KEY"];

assert(sshPrivateKey !== undefined);

const githubPersonalAccessTokenForApiRateLimit = process.env["SILL_GITHUB_TOKEN"];

assert(githubPersonalAccessTokenForApiRateLimit !== undefined);

(async () => {
    const { core } = await bootstrapCore({
        "keycloakUserApiParams": undefined,
        "gitDbApiParams": {
            "dataRepoSshUrl": "git@github.com:codegouvfr/sill-data.git",
            sshPrivateKey,
            sshPrivateKeyName
        },
        githubPersonalAccessTokenForApiRateLimit,
        "doPerPerformPeriodicalCompilation": false,
        "doPerformCacheInitialization": false
    });

    await core.functions.readWriteSillData.manuallyTriggerNonIncrementalCompilation();

    process.exit(0);
})();
