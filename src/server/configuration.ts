import { symToStr } from "tsafe/symToStr";
import memoize from "memoizee";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import * as JSONC from "comment-json";
import type { LocalizedString } from "../model-dsfr/types";
import { z } from "zod";
import { zLocalizedString } from "../model-dsfr/z";

export type Configuration = {
    keycloakParams?: {
        url: string; //Example: https://etalab-auth.lab.sspcloud.fr/auth (with the /auth at the end)
        realm: string;
        clientId: string;
        termsOfServices?: LocalizedString;
        adminPassword: string;
    };
    //The name of the properties in the JWT parsed token.
    jwtClaims: {
        id: string;
        email: string;
        agencyName: string;
        locale: string;
    };
    dataRepoSshUrl: string;
    // Like id_ed25537
    sshPrivateKeyForGitName: string;
    // Like -----BEGIN OPENSSH PRIVATE KEY-----\nxxx ... xxx\n-----END OPENSSH PRIVATE KEY-----\n
    // You can a fake key in .env.local.sh for running yarn dev
    sshPrivateKeyForGit: string;
    githubWebhookSecret?: string;
    // Only for increasing the rate limit on GitHub API
    // we use the GitHub API for pre filling the version when adding a software
    githubPersonalAccessToken?: string;
    //Port we listen to, default 8080
    port?: number;
};

const zConfiguration = z.object({
    "keycloakParams": z
        .object({
            "url": z.string(),
            "realm": z.string(),
            "clientId": z.string(),
            "termsOfServices": zLocalizedString.optional(),
            "adminPassword": z.string()
        })
        .optional(),
    "jwtClaims": z.object({
        "id": z.string(),
        "email": z.string(),
        "agencyName": z.string(),
        "locale": z.string()
    }),
    "dataRepoSshUrl": z.string(),
    "sshPrivateKeyForGitName": z.string(),
    "sshPrivateKeyForGit": z.string(),
    "githubWebhookSecret": z.string().optional(),
    "githubPersonalAccessToken": z.string().optional(),
    "port": z.number().optional()
});

{
    type Got = ReturnType<(typeof zConfiguration)["parse"]>;
    type Expected = Configuration;

    assert<Equals<Got, Expected>>();
}

export const getConfiguration = memoize(
    (): Omit<Configuration, "port"> & {
        port: number;
    } => {
        const { CONFIGURATION } = process.env;

        if (CONFIGURATION === undefined) {
            throw new Error(
                `We need a ${symToStr({
                    CONFIGURATION
                })} environnement variable`
            );
        }

        let configuration: Configuration;

        try {
            configuration = JSONC.parse(CONFIGURATION) as any;
        } catch {
            throw new Error(
                `The CONFIGURATION environnement variable is not a valid JSONC string (JSONC = JSON + Comment support)\n${CONFIGURATION}`
            );
        }

        zConfiguration.parse(configuration);

        return {
            ...configuration,
            "port": configuration.port ?? 8080
        };
    }
);

if (require.main === module) {
    console.log(getConfiguration());
}
