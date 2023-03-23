export { type TrpcRouter } from "./rpc/router";

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
export type TrpcRouterInput = inferRouterInputs<TrpcRouter>;
export type TrpcRouterOutput = inferRouterOutputs<TrpcRouter>;

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

export { type User, createAccessTokenToUser } from "./rpc/user";
import { TrpcRouter } from "./rpc/router";

export { type Language, type LocalizedString, languages } from "./core/ports/GetWikidataSoftware";
