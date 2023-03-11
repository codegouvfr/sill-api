import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";
import compression from "compression";
import { createCoreApi } from "../core";
import { buildBranch } from "../core/adapters/createGitDbApi";
import type { LocalizedString } from "../model/types";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { createContextFactory, type User } from "./context";
import { createRouter } from "./router";

export async function startRpcService(params: {
    keycloakParams?: {
        url: string;
        realm: string;
        clientId: string;
        adminPassword: string;
        termsOfServices?: LocalizedString;
        agencyNameAttributeName: string;
    };
    jwtClaimByUserKey: Record<keyof User, string>;
    dataRepoSshUrl: string;
    sshPrivateKeyForGitName: string;
    sshPrivateKeyForGit: string;
    githubWebhookSecret?: string;
    githubPersonalAccessToken?: string;
    port: number;
}) {
    const {
        dataRepoSshUrl,
        sshPrivateKeyForGitName,
        sshPrivateKeyForGit,
        keycloakParams,
        jwtClaimByUserKey,
        githubWebhookSecret,
        port,
        githubPersonalAccessToken,
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
                  }
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
                  }
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
                    setInterval(() => {
                        console.log("Checking if data refreshed");
                        coreApi.functions.readWriteSillData.notifyNeedForSyncLocalStateAndDatabase();
                    }, 3600 * 1000);

                    return async (...[, res]) => res.sendStatus(410);
                }

                const { validateGitHubWebhookSignature } = createValidateGitHubWebhookSignature({
                    githubWebhookSecret
                });

                return async (req, res) => {
                    console.log("Webhook signature OK");
                    const reqBody = await validateGitHubWebhookSignature(req, res);

                    if (reqBody.ref !== `refs/heads/${buildBranch}`) {
                        console.log(`Not a push on the ${buildBranch} branch, doing nothing`);
                        res.sendStatus(200);
                        return;
                    }

                    console.log("Refreshing data");

                    coreApi.functions.readWriteSillData.notifyNeedForSyncLocalStateAndDatabase();

                    res.sendStatus(200);
                };
            })()
        )
        .get(`/${exposedSubpath}/sill.json`, (...[, res]) =>
            res
                .setHeader("Content-Type", "application/json")
                .send(coreApi.functions.readWriteSillData.getSillJsonBuffer())
        )
        .use(
            `/${exposedSubpath}`,
            trpcExpress.createExpressMiddleware({
                router,
                createContext
            })
        )
        .listen(port, () => console.log(`Listening on port ${port}`));
}
