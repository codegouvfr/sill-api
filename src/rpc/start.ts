import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";
import compression from "compression";
import { createCoreApi } from "../core";
import type { LocalizedString } from "../core/ports/GetWikidataSoftware";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { createContextFactory } from "./context";
import type { User } from "./user";
import { createRouter } from "./router";
import { basename as pathBasename } from "path";

export async function startRpcService(params: {
    keycloakParams?: {
        url: string;
        realm: string;
        clientId: string;
        adminPassword: string;
        organizationUserProfileAttributeName: string;
    };
    termsOfServiceUrl: LocalizedString;
    readmeUrl: LocalizedString;
    jwtClaimByUserKey: Record<keyof User, string>;
    dataRepoSshUrl: string;
    sshPrivateKeyForGitName: string;
    sshPrivateKeyForGit: string;
    githubWebhookSecret?: string;
    githubPersonalAccessTokenForApiRateLimit: string;
    port: number;
    isDevEnvironnement: boolean;
    redirectUrl?: string;
}) {
    const {
        redirectUrl,
        dataRepoSshUrl,
        sshPrivateKeyForGitName,
        sshPrivateKeyForGit,
        keycloakParams,
        termsOfServiceUrl,
        readmeUrl,
        jwtClaimByUserKey,
        githubWebhookSecret,
        port,
        githubPersonalAccessTokenForApiRateLimit,
        isDevEnvironnement,
        ...rest
    } = params;

    assert<Equals<typeof rest, {}>>();

    console.log({ isDevEnvironnement });

    const coreApi = await createCoreApi({
        "gitDbApiParams": {
            dataRepoSshUrl,
            "sshPrivateKeyName": sshPrivateKeyForGitName,
            "sshPrivateKey": sshPrivateKeyForGit
        },
        "keycloakUserApiParams":
            keycloakParams === undefined
                ? undefined
                : {
                      "url": keycloakParams.url,
                      "realm": keycloakParams.realm,
                      "adminPassword": keycloakParams.adminPassword,
                      "organizationUserProfileAttributeName": keycloakParams.organizationUserProfileAttributeName
                  },
        githubPersonalAccessTokenForApiRateLimit,
        "doPerPerformPeriodicalCompilation": !isDevEnvironnement && redirectUrl === undefined,
        "doPerformCacheInitialization": redirectUrl === undefined
    });

    console.log("Core API initialized");

    const { createContext } = createContextFactory({
        jwtClaimByUserKey,
        "keycloakParams":
            keycloakParams === undefined
                ? undefined
                : {
                      "url": keycloakParams.url,
                      "realm": keycloakParams.realm,
                      "clientId": keycloakParams.clientId
                  }
    });

    const { router } = createRouter({
        coreApi,
        jwtClaimByUserKey,
        "keycloakParams":
            keycloakParams === undefined
                ? undefined
                : {
                      "url": keycloakParams.url,
                      "realm": keycloakParams.realm,
                      "clientId": keycloakParams.clientId,
                      "organizationUserProfileAttributeName": keycloakParams.organizationUserProfileAttributeName
                  },
        termsOfServiceUrl,
        readmeUrl,
        redirectUrl
    });

    express()
        .use(cors())
        .use(compression())
        .use((req, _res, next) => (console.log("⬅", req.method, req.path, req.body ?? req.query), next()))
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post(
            `*/ondataupdated`,
            (() => {
                if (githubWebhookSecret === undefined) {
                    return async (...[, res]) => res.sendStatus(410);
                }

                const { validateGitHubWebhookSignature } = createValidateGitHubWebhookSignature({
                    githubWebhookSecret
                });

                return async (req, res) => {
                    const reqBody = await validateGitHubWebhookSignature(req, res);

                    console.log("Webhook signature OK");

                    if (redirectUrl !== undefined) {
                        console.log("Doing nothing with the webhook, this instance is effectively disabled");
                    }

                    if (reqBody.ref !== `refs/heads/main`) {
                        console.log(`Not a push on the main branch, doing nothing`);
                        res.sendStatus(200);
                        return;
                    }

                    console.log("Push on main branch of data repo");

                    coreApi.functions.readWriteSillData.notifyPushOnMainBranch({
                        "commitMessage": reqBody.head_commit.message
                    });

                    res.sendStatus(200);
                };
            })()
        )
        .get(`*/sill.json`, (...[, res]) => {
            const { compiledDataPublicJson } = coreApi.selectors.readWriteSillData.compiledDataPublicJson(
                coreApi.getState()
            );

            res.setHeader("Content-Type", "application/json").send(Buffer.from(compiledDataPublicJson, "utf8"));
        })
        .use(
            (() => {
                const trpcMiddleware = trpcExpress.createExpressMiddleware({ router, createContext });

                return (req, res, next) => {
                    const proxyReq = new Proxy(req, {
                        get: (target, prop) => {
                            if (prop === "path") {
                                return `/${pathBasename(target.path)}`;
                            }
                            return Reflect.get(target, prop);
                        }
                    });

                    return trpcMiddleware(proxyReq, res, next);
                };
            })()
        )
        .listen(port, () => console.log(`Listening on port ${port}`));
}
