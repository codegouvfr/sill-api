//import * as trpc from '@trpc/server';
import type { ReturnType } from "tsafe";
import { decodeAndVerifyKeycloakOidcAccessTokenFactory } from "./tools/decodeAndVerifyJwtToken";
import { env } from "./env";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

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
export type Context = ReturnType<typeof createContext>;
