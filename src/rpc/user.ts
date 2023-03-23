import { z } from "zod";
import { assert, type Equals } from "tsafe/assert";
import { parsedJwtPayloadToUser } from "../tools/parsedJwtPayloadToUser";

export type User = {
    id: string;
    email: string;
    agencyName: string;
    locale?: string;
};

const zUser = z.object({
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

export function createAccessTokenToUser(params: {
    accessTokenToParsedJwtPayload: (accessToken: string) => Record<string, unknown>;
}) {
    const { accessTokenToParsedJwtPayload } = params;

    function accessTokenToUser(params: { accessToken: string; jwtClaimByUserKey: Record<keyof User, string> }): User {
        const { accessToken, jwtClaimByUserKey } = params;

        const user = parsedJwtPayloadToUser({
            zUser,
            "parsedJwtPayload": accessTokenToParsedJwtPayload(accessToken),
            jwtClaimByUserKey
        });

        user.email = user.email.toLowerCase();

        return user;
    }

    return { accessTokenToUser };
}
