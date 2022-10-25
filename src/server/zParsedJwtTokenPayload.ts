import { z } from "zod";
import type { Configuration } from "./configuration";
import type { Equals } from "tsafe";
import { assert } from "tsafe/assert";

export const zParsedJwtTokenPayload = z.object({
    "id": z.string(),
    "email": z.string(),
    "agencyName": z.string(),
    "locale": z.string().optional()
});

export type ParsedJwt = ReturnType<typeof zParsedJwtTokenPayload["parse"]>;

assert<Equals<keyof ParsedJwt, keyof Configuration["jwtClaims"]>>();
