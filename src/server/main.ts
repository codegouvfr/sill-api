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
import { NoReferentCredentialsSoftware } from "../model/types";
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
    const softwares = await fetchArchive({
        "githubPersonalAccessToken": configuration.githubPersonalAccessToken,
        "archiveRepoUrl": configuration.archiveRepoUrl,
        "archiveRepoBranch": configuration.archiveRepoBranch,
    });

    const noReferentCredentialSoftwares = softwares.map(
        ({ referentEmail, ...rest }): NoReferentCredentialsSoftware => ({
            ...rest,
            "hasReferent": referentEmail !== null,
        }),
    );

    return trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getSoftware", {
            "resolve": () => noReferentCredentialSoftwares,
        })
        .query("getUserSoftwareIds", {
            "resolve": ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { email } = ctx.parsedJwt;

                return softwares
                    .filter(
                        softwares =>
                            softwares.referentEmail?.toLowerCase() ===
                            email.toLowerCase(),
                    )
                    .filter(({ id }) => id);
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
