import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { getConfiguration } from "./configuration";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
//import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { fetchCompiledData } from "./fetchCompiledData";
import { fetchDb } from "./fetchDb";
import { createDecodeJwtKeycloakFactory } from "../tools/decodeJwt/adapter/keycloak";
import { createDecodeJwtNoVerify } from "../tools/decodeJwt/adapter/noVerify";
import { CompiledData } from "../model/types";
import { removeReferent } from "../model/buildCatalog";
import { TRPCError } from "@trpc/server";
import cors from "cors";
import * as crypto from "crypto";
import { parseBody } from "../tools/parseBody";
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
            "buildBranch": configuration.buildBranch,
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
            check_signature: {
                if (configuration.githubWebhookSecret === "NO VERIFY") {
                    console.log("Skipping signature validation");

                    break check_signature;
                }

                const receivedHash = req.header("HTTP_X_HUB_SIGNATURE_256");

                if (receivedHash === undefined) {
                    res.sendStatus(401);
                    return;
                }

                const hash =
                    "sha256=" +
                    crypto
                        .createHmac("sha256", configuration.githubWebhookSecret)
                        .update(await parseBody(req))
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
