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
            "dataRepoSshUrl": "git@github.com:codegouv/sill-data.git",
            sshPrivateKey,
            sshPrivateKeyName
        }
    });

    await coreApi.functions.readWriteSillData.triggerPeriodicalNonIncrementalCompilation();
})();
