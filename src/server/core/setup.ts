import type { ReturnType } from "tsafe";
import {
    createCoreFromUsecases,
    createUsecasesApi,
} from "redux-clean-architecture";
import type { GenericCreateEvt, GenericThunks } from "redux-clean-architecture";
import type { DbApi } from "./ports/DbApi";
import type { UserApi } from "./ports/UserApi";
import type { GitDbApiParams } from "./adapters/createGitDbApi";
import { createGitDbApi } from "./adapters/createGitDbApi";
import type { KeycloakUserApiParams } from "./adapters/createKeycloakUserApi";
import { createKeycloakUserApi } from "./adapters/createKeycloakUserApi";
import * as webApiUsecase from "./usecases/webApi";
import { createObjectThatThrowsIfAccessed } from "redux-clean-architecture";
import { id } from "tsafe/id";

const usecases = [webApiUsecase];

export const usecasesApi = createUsecasesApi(usecases);

export type CoreParams = {
    gitDbApiParams: GitDbApiParams;
    keycloakUserApiParams: KeycloakUserApiParams | undefined;
};

export type ThunksExtraArgument = {
    createStoreParams: CoreParams;
    dbApi: DbApi;
    userApi: UserApi;
};

export async function createCore(params: CoreParams) {
    const { gitDbApiParams, keycloakUserApiParams } = params;

    const core = createCoreFromUsecases({
        "thunksExtraArgument": id<ThunksExtraArgument>({
            "createStoreParams": params,
            "dbApi": createGitDbApi(gitDbApiParams),
            "userApi":
                keycloakUserApiParams === undefined
                    ? createObjectThatThrowsIfAccessed<UserApi>({
                          "debugMessage": "No Keycloak server",
                      })
                    : createKeycloakUserApi(keycloakUserApiParams),
        }),
        usecases,
    });

    await core.dispatch(webApiUsecase.privateThunks.initialize());

    return core;
}

type Core = ReturnType<typeof createCore>;

export type State = ReturnType<Core["getState"]>;

export type Thunks = GenericThunks<Core>;

export type CreateEvt = GenericCreateEvt<Core>;
