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
import { comptoirDuLibreApi } from "./adapters/getComptoirDuLibre";
import { getWikidataSoftwareOptions } from "./adapters/getWikidataSoftwareOptions";
import { createGetSoftwareLatestVersion } from "./adapters/getSoftwareLatestVersion";

export async function createCore(params: {
    gitDbApiParams: GitDbApiParams;
    keycloakUserApiParams: KeycloakUserApiParams | undefined;
    githubPersonalAccessTokenForApiRateLimit: string;
    doPerPerformPeriodicalCompilation: boolean;
    doPerformCacheInitialization: boolean;
}) {
    const {
        gitDbApiParams,
        keycloakUserApiParams,
        githubPersonalAccessTokenForApiRateLimit,
        doPerPerformPeriodicalCompilation,
        doPerformCacheInitialization
    } = params;

    const { getSoftwareLatestVersion } = createGetSoftwareLatestVersion({
        githubPersonalAccessTokenForApiRateLimit
    });

    const { compileData } = createCompileData({
        getWikidataSoftware,
        getCnllPrestatairesSill,
        comptoirDuLibreApi,
        getSoftwareLatestVersion
    });

    const { dbApi, initializeDbApiCache } = createGitDbApi(gitDbApiParams);

    const { userApi, initializeUserApiCache } =
        keycloakUserApiParams === undefined
            ? {
                  "userApi": createObjectThatThrowsIfAccessed<UserApi>({
                      "debugMessage": "No Keycloak server"
                  }),
                  "initializeUserApiCache": async () => {}
              }
            : createKeycloakUserApi(keycloakUserApiParams);

    const core = createCoreFromUsecases({
        usecases,
        "thunksExtraArgument": {
            "createStoreParams": params,
            dbApi,
            userApi,
            compileData,
            getWikidataSoftwareOptions,
            comptoirDuLibreApi,
            getWikidataSoftware,
            getSoftwareLatestVersion
        }
    });

    await core.dispatch(
        usecases.readWriteSillData.protectedThunks.initialize({
            doPerPerformPeriodicalCompilation
        })
    );

    if (doPerformCacheInitialization) {
        console.log("Performing cache initialization...");

        await Promise.all([initializeDbApiCache(), initializeUserApiCache()]);
    }

    return core;
}

type Core = ReturnType<typeof createCore>;

export type RootState = ReturnType<Core["getState"]>;

export type Thunks = GenericThunks<Core>;

export type CreateEvt = GenericCreateEvt<Core>;
