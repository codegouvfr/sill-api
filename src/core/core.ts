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
import { objectKeys } from "tsafe/objectKeys";
import { exclude } from "tsafe/exclude";

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

    const userApi =
        keycloakUserApiParams === undefined
            ? createObjectThatThrowsIfAccessed<UserApi>({
                  "debugMessage": "No Keycloak server"
              })
            : createKeycloakUserApi(keycloakUserApiParams);

    const core = createCoreFromUsecases({
        usecases,
        "thunksExtraArgument": {
            "createStoreParams": params,
            "dbApi": createGitDbApi(gitDbApiParams),
            userApi,
            compileData,
            getWikidataSoftwareOptions,
            comptoirDuLibreApi,
            getWikidataSoftware,
            getSoftwareLatestVersion
        }
    });

    await core.dispatch(
        usecases.readWriteSillData.privateThunks.initialize({
            doPerPerformPeriodicalCompilation
        })
    );

    if (doPerformCacheInitialization) {
        console.log("Performing cache initialization...");

        //NOTE: Cache initialization so that the first user do not get slow response.
        objectKeys(usecases)
            .map(usecaseName => usecases[usecaseName])
            .map(usecase => ("selectors" in usecase ? usecase.selectors : undefined))
            .filter(exclude(undefined))
            .forEach(selectors =>
                objectKeys(selectors)
                    .map(selectorName => selectors[selectorName])
                    .forEach(selector => selector(core.getState()))
            );

        await userApi.getUserCount();
    }

    return core;
}

type Core = ReturnType<typeof createCore>;

export type RootState = ReturnType<Core["getState"]>;

export type Thunks = GenericThunks<Core>;

export type CreateEvt = GenericCreateEvt<Core>;
