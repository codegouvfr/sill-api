import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { getConfiguration } from "./configuration";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
//import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { fetchCompiledData, buildBranch } from "./fetchCompiledData";
import { fetchDb } from "./fetchDb";
import { createDecodeJwtKeycloakFactory } from "../tools/decodeJwt/adapter/keycloak";
import { createDecodeJwtNoVerify } from "../tools/decodeJwt/adapter/noVerify";
import { CompiledData /*MimGroup*/ } from "../model/types";
import { removeReferent } from "../model/buildCatalog";
import { TRPCError } from "@trpc/server";
import cors from "cors";
import * as crypto from "crypto";
import { getRequestBody } from "../tools/getRequestBody";
import memoize from "memoizee";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";

const configuration = getConfiguration();

const { createDecodeJwt } =
    configuration.keycloakParams === undefined
        ? { "createDecodeJwt": createDecodeJwtNoVerify }
        : createDecodeJwtKeycloakFactory(configuration.keycloakParams);

const { decodeJwt } = createDecodeJwt({
    "jwtClaims": configuration.jwtClaims,
});

async function createContext({ req }: CreateExpressContextOptions) {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers

    const { authorization } = req.headers;

    if (!authorization) {
        return null;
    }

    const parsedJwt = await decodeJwt({
        "jwtToken": authorization.split(" ")[1],
    });

    return { parsedJwt };
}

const getCachedData = memoize(
    async () => {
        const compiledData = await fetchCompiledData({
            "githubPersonalAccessToken":
                configuration.githubPersonalAccessToken,
            "dataRepoUrl": configuration.dataRepoUrl,
        });

        const compiledData_withoutReferents = {
            ...compiledData,
            "catalog": compiledData.catalog.map(removeReferent),
        };

        assert<
            Equals<
                typeof compiledData_withoutReferents,
                CompiledData<"without referents">
            >
        >();

        const { softwareReferentRows } = await fetchDb({
            "dataRepoUrl": configuration.dataRepoUrl,
            "githubPersonalAccessToken":
                configuration.githubPersonalAccessToken,
        });

        return {
            compiledData_withoutReferents,
            softwareReferentRows,
        };
    },
    { "promise": true },
);

const createRouter = () =>
    trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getCompiledData", {
            "resolve": async () =>
                (await getCachedData()).compiledData_withoutReferents,
        })
        .query("getIdOfSoftwareUserIsReferentOf", {
            "resolve": async ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                return (await getCachedData()).softwareReferentRows
                    .filter(
                        ({ referentEmail }) =>
                            ctx.parsedJwt.email === referentEmail,
                    )
                    .map(({ softwareId }) => softwareId);
            },
        });
/*
        .mutation("addSoftware", {
            "input": z
                .object({
                    "name": z.string(),
                    "function": z.string(),
                    "isFromFrenchPublicService": z.boolean(),
                    "wikidataId": z.string().optional(),
                    "comptoirDuLibreId": z.string().optional(),
                    "license": z.string(),
                    "mimGroup": (() => {

                        const out = z.union([
                            z.literal("MIMO"),
                            z.literal("MIMDEV"),
                            z.literal("MIMDEVOPS"),
                            z.literal("MIMPROD"),
                        ]);

                        assert<Equals<ReturnType<typeof out.parse>, MimGroup>>();

                        return out;

                    })(),
                    "versionMin": z.string(),
                }),
            "resolve": () => {

                //TODO
            }

        });
        */

export type TrpcRouter = ReturnType<typeof createRouter>;

(function main() {
    //NOTE: For pre fetching
    getCachedData();

    express()
        .use(cors())
        .use(
            (req, _res, next) => (
                console.log("⬅", req.method, req.path, req.body ?? req.query),
                next()
            ),
        )
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post("/api/ondataupdated", async (req, res) => {
            check_signature_validate_event: {
                if (configuration.githubWebhookSecret === "NO VERIFY") {
                    console.log("Skipping signature validation");

                    break check_signature_validate_event;
                }

                const receivedHash = req.header("X-Hub-Signature-256");

                if (receivedHash === undefined) {
                    console.log("No authentication header");
                    res.sendStatus(401);
                    return;
                }

                const body = await getRequestBody(req);

                const hash =
                    "sha256=" +
                    crypto
                        .createHmac("sha256", configuration.githubWebhookSecret)
                        .update(body)
                        .digest("hex");

                if (
                    !crypto.timingSafeEqual(
                        Buffer.from(receivedHash, "utf8"),
                        Buffer.from(hash, "utf8"),
                    )
                ) {
                    res.sendStatus(403);
                    return;
                }

                console.log("Webhook signature OK");

                const parsedBody: {
                    ref: string;
                    repository: {
                        url: string;
                    };
                } = JSON.parse(body.toString("utf8"));

                assert(
                    configuration.dataRepoUrl.replace(/\/$/, "") ===
                        parsedBody.repository.url,
                    "Webhook doesn't come from the right repo",
                );

                if (parsedBody.ref !== `refs/heads/${buildBranch}`) {
                    console.log(
                        `Not a push on the ${buildBranch} branch, doing nothing`,
                    );
                    res.sendStatus(200);
                    return;
                }
            }

            console.log("Refreshing data");

            getCachedData.clear();
            getCachedData();

            res.sendStatus(200);
        })
        .use(
            "/api",
            trpcExpress.createExpressMiddleware({
                "router": createRouter(),
                createContext,
            }),
        )
        .listen(configuration.port, () =>
            console.log(`Listening on port ${configuration.port}`),
        );
})();
