import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { getConfiguration } from "./configuration";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
//import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { fetchArchive } from "./fetchArchive";
import { createDecodeJwtKeycloakFactory } from "../tools/decodeJwt/adapter/keycloak";
import { createDecodeJwtNoVerify } from "../tools/decodeJwt/adapter/noVerify";
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
    const softwares = await fetchArchive({
        "githubPersonalAccessToken": configuration.githubPersonalAccessToken,
        "archiveRepoUrl": configuration.archiveRepoUrl,
        "archiveRepoBranch": configuration.archiveRepoBranch,
    });

    return trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getSoftware", {
            "resolve": ({ ctx }) => {
                console.log(ctx?.parsedJwt);
                return softwares;
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
        .use(
            (...[, res, next]) => (
                res.header("Access-Control-Allow-Headers", "*"), next()
            ),
        )
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
