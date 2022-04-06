import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { getConfiguration } from "./configuration";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createValidateKeycloakSignature } from "../tools/createValidateKeycloakSignature";
import { parseJwtPayload } from "../tools/parseJwtPayload";
import * as jwtSimple from "jwt-simple";
import { TRPCError } from "@trpc/server";
import cors from "cors";
import { assert } from "tsafe/assert";
import { zParsedJwtTokenPayload } from "./zParsedJwtTokenPayload";
import { z } from "zod";
import { Evt } from "evt";
import type { DataApi } from "./ports/DataApi";
import {
    createGitHubDataApi,
    buildBranch,
} from "./adapter/createGitHubDataApi";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";

const configuration = getConfiguration();

const { validateKeycloakSignature } =
    configuration.keycloakParams !== undefined
        ? createValidateKeycloakSignature(configuration.keycloakParams)
        : { "validateKeycloakSignature": undefined };

async function createContext({ req }: CreateExpressContextOptions) {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers

    const { authorization } = req.headers;

    if (!authorization) {
        return null;
    }

    const jwtToken = authorization.split(" ")[1];

    await validateKeycloakSignature?.({ jwtToken });

    const parsedJwt = parseJwtPayload({
        "jwtClaims": configuration.jwtClaims,
        zParsedJwtTokenPayload,
        "jwtPayload": jwtSimple.decode(jwtToken, "", true),
    });

    return { parsedJwt };
}

const createRouter = (params: { dataApi: DataApi }) => {
    const { dataApi } = params;
    const router = trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getCompiledData", {
            "resolve": () =>
                dataApi.derivedStates.evtCompiledDataWithoutReferents.state,
        })
        .query("getReferentsBySoftwareId", {
            "resolve": async ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }
                return dataApi.derivedStates.evtReferentsBySoftwareId.state;
            },
        })
        .mutation("declareUserReferent", {
            "input": z.object({
                "softwareId": z.number(),
                "isExpert": z.boolean(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, isExpert } = input;

                const { agencyName, email } = ctx.parsedJwt;

                await dataApi.mutators.createReferent({
                    "referentRow": {
                        agencyName,
                        email,
                        "firstName": "todo ask when register",
                        "familyName": "todo ask when register",
                    },
                    softwareId,
                    isExpert,
                });
            },
        })
        .mutation("userNoLongerReferent", {
            "input": z.object({
                "softwareId": z.number(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId } = input;

                const { email } = ctx.parsedJwt;

                await dataApi.mutators.userNoLongerReferent({
                    softwareId,
                    email,
                });
            },
        });
    return { router };
};
export type TrpcRouter = ReturnType<typeof createRouter>["router"];

const isDevelopment = process.env["ENVIRONNEMENT"] === "development";

(async function main() {
    const evtDataUpdated = Evt.create();

    if (isDevelopment) {
        setInterval(() => {
            console.log("Fake data update");
            evtDataUpdated.post();
        }, 10000);
    }

    express()
        .use(cors())
        .use(
            (req, _res, next) => (
                console.log("⬅", req.method, req.path, req.body ?? req.query),
                next()
            ),
        )
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post(
            "/api/ondataupdated",
            (() => {
                const { validateGitHubWebhookSignature } =
                    createValidateGitHubWebhookSignature({
                        "githubWebhookSecret":
                            configuration.githubWebhookSecret,
                    });

                return async (req, res) => {
                    console.log("Webhook signature OK");
                    const reqBody = await validateGitHubWebhookSignature(
                        req,
                        res,
                    );

                    assert(
                        configuration.dataRepoUrl.replace(/\/$/, "") ===
                            reqBody.repository.url,
                        "Webhook doesn't come from the right repo",
                    );

                    if (reqBody.ref !== `refs/heads/${buildBranch}`) {
                        console.log(
                            `Not a push on the ${buildBranch} branch, doing nothing`,
                        );
                        res.sendStatus(200);
                        return;
                    }

                    console.log("Refreshing data");

                    evtDataUpdated.post();

                    res.sendStatus(200);
                };
            })(),
        )
        .use(
            "/api",
            await (async () => {
                const { router } = createRouter({
                    "dataApi": await createGitHubDataApi({
                        "dataRepoUrl": configuration.dataRepoUrl,
                        "githubPersonalAccessToken":
                            configuration.githubPersonalAccessToken,
                        evtDataUpdated,
                        "doPeriodicallyTriggerComputationOfCompiledData":
                            !isDevelopment,
                    }),
                });

                return trpcExpress.createExpressMiddleware({
                    router,
                    createContext,
                });
            })(),
        )
        .listen(configuration.port, () =>
            console.log(`Listening on port ${configuration.port}`),
        );
})();
