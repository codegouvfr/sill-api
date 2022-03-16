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

async function createRouter() {
    const compiledData = await fetchCompiledData({
        "githubPersonalAccessToken": configuration.githubPersonalAccessToken,
        "dataRepoUrl": configuration.dataRepoUrl,
        "buildBranch": configuration.buildBranch,
    });

    const compiledData_withoutReferents: CompiledData<"without referents"> = {
        ...compiledData,
        "catalog": compiledData.catalog.map(removeReferent),
    };

    const { softwareReferentRows } = await fetchDb({
        "dataRepoUrl": configuration.dataRepoUrl,
        "githubPersonalAccessToken": configuration.githubPersonalAccessToken,
    });

    return trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getCompiledData", {
            "resolve": () => compiledData_withoutReferents,
        })
        .query("getIdOfSoftwareUserIsReferentOf", {
            "resolve": ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                return softwareReferentRows
                    .filter(
                        ({ referentEmail }) =>
                            ctx.parsedJwt.email === referentEmail,
                    )
                    .map(({ softwareId }) => softwareId);
            },
        });
}

export type TrpcRouter = ReturnType<typeof createRouter>;

(async function main() {
    express()
        .use(cors())
        .use(
            (req, _res, next) => (
                console.log("⬅", req.method, req.path, req.body ?? req.query),
                next()
            ),
        )
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .use(
            "/api",
            trpcExpress.createExpressMiddleware({
                "router": await createRouter(),
                createContext,
            }),
        )
        .listen(configuration.port, () =>
            console.log(`Listening on port ${configuration.port}`),
        );
})();
