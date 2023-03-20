import type { ReturnType } from "tsafe";
import { createCoreFromUsecases } from "redux-clean-architecture";
import { usecases } from "./usecases";
import type { GenericCreateEvt, GenericThunks } from "redux-clean-architecture";
import type { UserApi } from "./ports/UserApi";
import type { GitDbApiParams } from "./adapters/dbApi";
import { createGitDbApi } from "./adapters/dbApi";
import type { KeycloakUserApiParams } from "./adapters/userApi";
import { createKeycloakUserApi } from "./adapters/userApi";
import { createObjectThatThrowsIfAccessed } from "redux-clean-architecture";
import { createCompileData } from "./adapters/compileData";
import { getWikidataSoftware } from "./adapters/getWikidataSoftware";
import { getCnllPrestatairesSill } from "./adapters/getCnllPrestatairesSill";
import { getComptoirDuLibre } from "./adapters/getComptoirDuLibre";
import { getWikidataOptions } from "./adapters/getWikidataSoftwareOptions";
import { createGetSoftwareLatestVersion } from "./adapters/getSoftwareLatestVersion";

export async function createCore(params: {
    gitDbApiParams: GitDbApiParams;
    keycloakUserApiParams: KeycloakUserApiParams | undefined;
    githubPersonalAccessTokenForApiRateLimit: string;
}) {
    const { gitDbApiParams, keycloakUserApiParams, githubPersonalAccessTokenForApiRateLimit } = params;

    const { compileData } = createCompileData({
        getWikidataSoftware,
        getCnllPrestatairesSill,
        getComptoirDuLibre
    });

    const { getSoftwareLatestVersion } = createGetSoftwareLatestVersion({
        githubPersonalAccessTokenForApiRateLimit
    });

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
            compileData,
            getWikidataOptions,
            getSoftwareLatestVersion,
            getComptoirDuLibre,
            getWikidataSoftware
        }
    });

    await core.dispatch(usecases.readWriteSillData.privateThunks.initialize());

    return core;
}

type Core = ReturnType<typeof createCore>;

export type RootState = ReturnType<Core["getState"]>;

export type Thunks = GenericThunks<Core>;

export type CreateEvt = GenericCreateEvt<Core>;
