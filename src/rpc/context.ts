import type { ReturnType } from "tsafe";
import { createValidateKeycloakSignature, type KeycloakParams } from "../tools/createValidateKeycloakSignature";
import * as jwtSimple from "jwt-simple";
import { assert } from "tsafe/assert";
import { z } from "zod";
import type { Equals } from "tsafe";
import { parsedJwtPayloadToUser } from "../tools/parsedJwtPayloadToUser";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type User = {
    id: string;
    email: string;
    agencyName: string;
    locale?: string;
};

export type Context = {
    user: User;
} | null;

export const zUser = z.object({
    "id": z.string(),
    "email": z.string(),
    "agencyName": z.string(),
    "locale": z.string().optional()
});

{
    type Got = ReturnType<(typeof zUser)["parse"]>;
    type Expected = User;

    assert<Equals<Got, Expected>>();
}

export function createContextFactory(params: {
    jwtClaimByUserKey: Record<keyof User, string>;
    keycloakParams: KeycloakParams | undefined;
}) {
    const { jwtClaimByUserKey, keycloakParams } = params;

    const { validateKeycloakSignature } =
        keycloakParams !== undefined
            ? createValidateKeycloakSignature(keycloakParams)
            : { "validateKeycloakSignature": undefined };

    async function createContext({ req }: CreateExpressContextOptions): Promise<Context> {
        const { authorization } = req.headers;

        if (!authorization) {
            return null;
        }

        const jwtToken = authorization.split(" ")[1];

        await validateKeycloakSignature?.({ jwtToken });

        const user = parsedJwtPayloadToUser({
            zUser,
            jwtClaimByUserKey,
            "parsedJwtPayload": jwtSimple.decode(jwtToken, "", true)
        });

        user.email = user.email.toLowerCase();

        return { user };
    }

    return { createContext };
}
