export { type TrpcRouter } from "./rpc/router";
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
} from "./core/usecases/readWriteSillData";

export { type User, zUser } from "./rpc/context";
import { parsedJwtPayloadToUser } from "./tools/parsedJwtPayloadToUser";

export const tools = {
    parsedJwtPayloadToUser
};

export { type Language, type LocalizedString, languages } from "./core/ports/GetWikidataSoftware";
