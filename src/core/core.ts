import type { ReturnType } from "tsafe";
import { createCoreFromUsecases } from "redux-clean-architecture";
import { usecases } from "./usecases";
import type { GenericCreateEvt, GenericThunks } from "redux-clean-architecture";
import type { UserApi } from "./ports/UserApi";
import type { GitDbApiParams } from "./adapters/createGitDbApi";
import { createGitDbApi } from "./adapters/createGitDbApi";
import type { KeycloakUserApiParams } from "./adapters/createKeycloakUserApi";
import { createKeycloakUserApi } from "./adapters/createKeycloakUserApi";
import { createObjectThatThrowsIfAccessed } from "redux-clean-architecture";
import { createCompileData } from "./adapters/compileData";
import { getWikidataSoftware } from "./adapters/getWikidataSoftware";
import { getCnllPrestatairesSill } from "./adapters/getCnllPrestatairesSill";
import { getComptoirDuLibre } from "./adapters/getComptoirDuLibre";

export async function createCore(params: {
    gitDbApiParams: GitDbApiParams;
    keycloakUserApiParams: KeycloakUserApiParams | undefined;
}) {
    const { gitDbApiParams, keycloakUserApiParams } = params;

    const core = createCoreFromUsecases({
        usecases,
        "thunksExtraArgument": {
            "createStoreParams": params,
            "dbApi": createGitDbApi(gitDbApiParams),
            "userApi":
                keycloakUserApiParams === undefined
                    ? createObjectThatThrowsIfAccessed<UserApi>({
                          "debugMessage": "No Keycloak server"
                      })
                    : createKeycloakUserApi(keycloakUserApiParams),
            "compileData": createCompileData({
                getWikidataSoftware,
                getCnllPrestatairesSill,
                getComptoirDuLibre
            })
        }
    });

    await core.dispatch(usecases.readWriteSillData.privateThunks.initialize());

    return core;
}

type Core = ReturnType<typeof createCore>;

export type RootState = ReturnType<Core["getState"]>;

export type Thunks = GenericThunks<Core>;

export type CreateEvt = GenericCreateEvt<Core>;
