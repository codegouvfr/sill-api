import { createUsecaseActions, createObjectThatThrowsIfAccessed, AccessError } from "redux-clean-architecture";
import type { Db } from "../../ports/DbApi";
import type { CompiledData } from "../../ports/CompileData";
import type { Software } from "./types";

export const name = "readWriteSillData";

type State = {
    db: Db;
    compiledData: CompiledData<"private">;
    cache:
        | {
              similarSoftwares: {
                  [softwareSillId: number]: {
                      similarSoftwareWikidataIds: string[];
                      similarSoftwares: Software.SimilarSoftware[];
                  };
              };
          }
        | undefined;
};

export const { reducer, actions } = createUsecaseActions({
    name,
    "initialState": createObjectThatThrowsIfAccessed<State>(),
    "reducers": {
        "updated": (
            state,
            {
                payload
            }: {
                payload: {
                    db: Db;
                    compiledData: CompiledData<"private">;
                };
            }
        ) => {
            const { db, compiledData } = payload;

            return {
                db,
                compiledData,
                "cache": (() => {
                    try {
                        return state.cache;
                    } catch (error) {
                        if (!(error instanceof AccessError)) {
                            throw error;
                        }
                        return undefined;
                    }
                })()
            };
        },
        "cacheUpdated": (
            state,
            {
                payload
            }: {
                payload: {
                    cache: State["cache"];
                };
            }
        ) => {
            const { cache } = payload;

            state.cache = cache;
        }
    }
});
