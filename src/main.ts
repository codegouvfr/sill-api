import { symToStr } from "tsafe/symToStr";
import { assert } from "tsafe/assert";
import * as JSONC from "comment-json";
import { z } from "zod";
import { zLocalizedString } from "./core/ports/GetWikidataSoftware";
import { startRpcService } from "./rpc";
import { is } from "tsafe/is";

const zParsedCONFIGURATION = z.object({
    "keycloakParams": z
        .object({
            "url": z.string(), //Example: https://auth.code.gouv.fr/auth (with the /auth at the end)
            "realm": z.string(),
            "clientId": z.string(),
            "adminPassword": z.string(),
            "organizationUserProfileAttributeName": z.string()
        })
        .optional(),
    "termsOfServiceUrl": zLocalizedString,
    "readmeUrl": zLocalizedString,
    "jwtClaimByUserKey": z.object({
        "id": z.string(),
        "email": z.string(),
        "organization": z.string()
    }),
    "dataRepoSshUrl": z.string(),
    // Like id_ed25537
    "sshPrivateKeyForGitName": z.string(),
    // Like -----BEGIN OPENSSH PRIVATE KEY-----\nxxx ... xxx\n-----END OPENSSH PRIVATE KEY-----\n
    // You can a fake key in .env.local.sh for running yarn dev
    "sshPrivateKeyForGit": z.string(),
    "githubWebhookSecret": z.string().optional(),
    // Only for increasing the rate limit on GitHub API
    // we use the GitHub API for pre filling the version when adding a software
    "githubPersonalAccessTokenForApiRateLimit": z.string(),
    //Port we listen to, default 8080
    "port": z.number().optional(),
    "isDevEnvironnement": z.boolean().optional()
});

const { parsedCONFIGURATION } = (() => {
    const { CONFIGURATION } = process.env;

    if (CONFIGURATION === undefined) {
        throw new Error(
            `We need a ${symToStr({
                CONFIGURATION
            })} environnement variable`
        );
    }

    let parsedCONFIGURATION: unknown;

    try {
        parsedCONFIGURATION = JSONC.parse(CONFIGURATION) as any;
    } catch {
        throw new Error(
            `The CONFIGURATION environnement variable is not a valid JSONC string (JSONC = JSON + Comment support)\n${CONFIGURATION}`
        );
    }

    zParsedCONFIGURATION.parse(parsedCONFIGURATION);

    assert(is<ReturnType<(typeof zParsedCONFIGURATION)["parse"]>>(parsedCONFIGURATION));

    return { parsedCONFIGURATION };
})();

startRpcService({
    ...parsedCONFIGURATION,
    "port": parsedCONFIGURATION.port ?? 8080,
    "isDevEnvironnement": parsedCONFIGURATION.isDevEnvironnement ?? false,
    "githubWebhookSecret": parsedCONFIGURATION.githubWebhookSecret || undefined
});
