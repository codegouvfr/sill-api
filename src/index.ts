/*
export { languages } from "./model/types";
export type { TrpcRouter } from "./server/rpc/rpc";
export { zParsedJwtTokenPayload } from "./server/zParsedJwtTokenPayload";
export type { ParsedJwt } from "./server/zParsedJwtTokenPayload";
export type { inferProcedureOutput, inferProcedureInput } from "@trpc/server";
export type {
    Agent,
    DeclarationFormData,
    Instance,
    Os,
    Prerogative,
    Software,
    SoftwareFormData,
    SoftwareType,
    WikidataEntry
} from "./server/core/usecases/readWriteSillData";
*/

export { type User, zUser } from "./server/rpc/context";
import { parsedJwtPayloadToUser } from "./tools/parsedJwtPayloadToUser";

export const tools = {
    parsedJwtPayloadToUser
};
