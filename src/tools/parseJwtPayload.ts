import type { ZodObject } from "zod";

export function parseJwtPayload<Z extends ZodObject<any>>(params: {
    zParsedJwtTokenPayload: Z;
    jwtClaims: Record<keyof ReturnType<Z["parse"]>, string>;
    jwtPayload: Record<string, unknown>;
}): ReturnType<Z["parse"]> {
    const { zParsedJwtTokenPayload, jwtClaims, jwtPayload } = params;

    return zParsedJwtTokenPayload.parse(
        Object.fromEntries(Object.entries(jwtClaims).map(([key, claimName]) => [key, jwtPayload[claimName]]))
    ) as any;
}

/*
import { z } from "zod";
const user = parseJwtPayload({
    "zParsedJwtTokenPayload": z.object({
        "names": z.array(z.string()),
        "birth": z.number()
    }),
    "jwtClaims": {
        "names": "first_names",
        "birth": "birth_time"
    } as const,
    "jwtPayload": {
        "first_names": ["John", "Jane"],
        "birth_time": 123456789
    }
});
*/
