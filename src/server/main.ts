import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { decodeAndVerifyKeycloakOidcAccessTokenFactory } from "./tools/decodeAndVerifyJwtToken";
import { env } from "./env";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";

const { decodeAndVerifyKeycloakOidcAccessToken } =
    decodeAndVerifyKeycloakOidcAccessTokenFactory({
        "keycloakUrl": env.KEYCLOAK_URL,
        "keycloakRealm": env.KEYCLOAK_REALM,
        "keycloakClientId": env.KEYCLOAK_CLIENT_ID,
    });

export async function createContext({ req }: CreateExpressContextOptions) {
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

const router = trpc.router<ReturnType<typeof createContext>>().query("hello", {
    "input": z.string().nullish(),
    "resolve": ({ input, ctx }) => `hello world ${input} ${ctx}`,
});

export type Router = typeof router;

{
    // express implementation
    const app = express();

    app.use((req, _res, next) => {
        // request logger
        console.log("⬅️ ", req.method, req.path, req.body ?? req.query);

        next();
    });

    app.use(
        "/trpc",
        trpcExpress.createExpressMiddleware({ router, createContext }),
    );

    app.get("/", (_req, res) => res.send("hello"));

    app.listen(2021, () => console.log("listening on port 2021"));
}
