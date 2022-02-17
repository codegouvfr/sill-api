import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { decodeAndVerifyKeycloakOidcAccessTokenFactory } from "../tools/decodeAndVerifyJwtToken";
import { env } from "./env";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
//import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { fetchSoftware } from "./fetchApiData";

const keycloakParams = {
    "keycloakUrl": env.KEYCLOAK_URL,
    "keycloakRealm": env.KEYCLOAK_REALM,
    "keycloakClientId": env.KEYCLOAK_CLIENT_ID,
};

const { decodeAndVerifyKeycloakOidcAccessToken } =
    decodeAndVerifyKeycloakOidcAccessTokenFactory(keycloakParams);

async function createContext({ req }: CreateExpressContextOptions) {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers

    const { authorization } = req.headers;

    if (!authorization) {
        return null;
    }

    const parsedJwt = decodeAndVerifyKeycloakOidcAccessToken({
        "keycloakOidcAccessToken": authorization.split(" ")[1],
    });

    return { parsedJwt };
}

async function createRouter() {
    const softwares = await fetchSoftware({
        "githubPersonalAccessToken": env.GITHUB_PERSONAL_ACCESS_TOKEN,
    });

    return trpc
        .router<ReturnType<typeof createContext>>()
        .query("getKeycloakParams", { "resolve": () => keycloakParams })
        .query("getSoftware", { "resolve": () => softwares });
}

export type Router = ReturnType<typeof createRouter>;

(async function main() {
    // express implementation
    const app = express();

    app.use((req, _res, next) => {
        // request logger
        console.log("⬅", req.method, req.path, req.body ?? req.query);

        next();
    });

    app.use(
        "/api",
        trpcExpress.createExpressMiddleware({
            "router": await createRouter(),
            createContext,
        }),
    );

    app.get("/", (_req, res) => res.send("hello"));

    app.listen(env.PORT, () => console.log(`Listening on port ${env.PORT}`));
})();
