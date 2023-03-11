/*
In this file we export utilities for using the core in a React setup.  
This file is the only place in src/core where it's okay to assume we are 
using react.  
If we where to change our UI framework we would only update this file to
export an API more adapted to our new front. (But we don't plan to leave React)
*/
import { createCoreApiFactory } from "redux-clean-architecture/vanilla";
import { createCore } from "./core";
import { usecases } from "./usecases";
import type { ReturnType } from "tsafe";

export const { createCoreApi } = createCoreApiFactory({
    createCore,
    usecases
});

export type CoreApi = ReturnType<typeof createCoreApi>;
