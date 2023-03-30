import { createCoreApi } from "../core";
import { assert } from "tsafe/assert";

const sshPrivateKeyName = process.env["SSH_PRIVATE_KEY_FOR_GIT_NAME"];

assert(sshPrivateKeyName !== undefined);

const sshPrivateKey = process.env["SSH_PRIVATE_KEY_FOR_GIT"];

assert(sshPrivateKey !== undefined);

(async () => {
    const coreApi = await createCoreApi({
        "keycloakUserApiParams": undefined,
        "gitDbApiParams": {
            "dataRepoSshUrl": "git@github.com:codegouvfr/sill-data.git",
            sshPrivateKey,
            sshPrivateKeyName
        },
        // It's just for API rate limit.
        "githubPersonalAccessTokenForApiRateLimit": ""
    });

    await coreApi.functions.readWriteSillData.triggerPeriodicalNonIncrementalCompilation();

    process.exit(0);
})();
