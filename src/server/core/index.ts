import { createCoreApiFactory } from "redux-clean-architecture/vanilla";
import { usecasesApi, createCore } from "./setup";

export const { createCoreApi } = createCoreApiFactory({
    createCore,
    usecasesApi,
});
