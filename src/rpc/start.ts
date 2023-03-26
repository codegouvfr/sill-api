import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";
import compression from "compression";
import { createCoreApi } from "../core";
import { compiledDataBranch } from "../core/adapters/dbApi";
import type { LocalizedString } from "../core/ports/GetWikidataSoftware";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { createContextFactory } from "./context";
import type { User } from "./user";
import { createRouter } from "./router";

export async function startRpcService(params: {
    keycloakParams?: {
        url: string;
        realm: string;
        clientId: string;
        adminPassword: string;
        agencyNameAttributeName: string;
    };
    termsOfServiceUrl: LocalizedString;
    jwtClaimByUserKey: Record<keyof User, string>;
    dataRepoSshUrl: string;
    sshPrivateKeyForGitName: string;
    sshPrivateKeyForGit: string;
    githubWebhookSecret?: string;
    githubPersonalAccessTokenForApiRateLimit: string;
    port: number;
}) {
    const {
        dataRepoSshUrl,
        sshPrivateKeyForGitName,
        sshPrivateKeyForGit,
        keycloakParams,
        termsOfServiceUrl,
        jwtClaimByUserKey,
        githubWebhookSecret,
        port,
        githubPersonalAccessTokenForApiRateLimit,
        ...rest
    } = params;

    assert<Equals<typeof rest, {}>>();

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
                      "agencyNameAttributeName": keycloakParams.agencyNameAttributeName
                  },
        githubPersonalAccessTokenForApiRateLimit
    });

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
                      "clientId": keycloakParams.clientId
                  },
        termsOfServiceUrl
    });

    const exposedSubpath = "api";

    express()
        .use(cors())
        .use(compression())
        .use((req, _res, next) => (console.log("⬅", req.method, req.path, req.body ?? req.query), next()))
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post(
            `/${exposedSubpath}/ondataupdated`,
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

                    if (reqBody.ref !== `refs/heads/${compiledDataBranch}`) {
                        console.log(`Not a push on the ${compiledDataBranch} branch, doing nothing`);
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
        .get(`/${exposedSubpath}/sill.json`, (...[, res]) => {
            const { compiledDataPublicJson } = coreApi.selectors.readWriteSillData.compiledDataPublicJson(
                coreApi.getState()
            );

            res.setHeader("Content-Type", "application/json").send(Buffer.from(compiledDataPublicJson, "utf8"));
        })
        .use(
            `/${exposedSubpath}`,
            trpcExpress.createExpressMiddleware({
                router,
                createContext
            })
        )
        .listen(port, () => console.log(`Listening on port ${port}`));
}
