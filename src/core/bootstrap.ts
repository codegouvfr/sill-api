import { createObjectThatThrowsIfAccessed, createCore, type GenericCore } from "redux-clean-architecture";
import { usecases } from "./usecases";
import { createGetSoftwareLatestVersion } from "./adapters/getSoftwareLatestVersion";
import { createCompileData } from "./adapters/compileData";
import { getWikidataSoftware } from "./adapters/getWikidataSoftware";
import { getCnllPrestatairesSill } from "./adapters/getCnllPrestatairesSill";
import { comptoirDuLibreApi } from "./adapters/comptoirDuLibreApi";
import { createGitDbApi } from "./adapters/dbApi";
import { createKeycloakUserApi } from "./adapters/userApi";
import { getWikidataSoftwareOptions } from "./adapters/getWikidataSoftwareOptions";
import { getServiceProviders } from "./adapters/getServiceProviders";
import type { DbApi } from "./ports/DbApi";
import type { UserApi } from "./ports/UserApi";
import type { CompileData } from "./ports/CompileData";
import type { GetSoftwareExternalDataOptions } from "./ports/GetSoftwareExternalDataOptions";
import type { ComptoirDuLibreApi } from "./ports/ComptoirDuLibreApi";
import type { GetSoftwareExternalData } from "./ports/GetSoftwareExternalData";
import type { GetSoftwareLatestVersion } from "./ports/GetSoftwareLatestVersion";

type ParamsOfBootstrapCore = {
    gitDbApiParams: import("./adapters/dbApi").GitDbApiParams;
    keycloakUserApiParams: import("./adapters/userApi").KeycloakUserApiParams | undefined;
    githubPersonalAccessTokenForApiRateLimit: string;
    doPerPerformPeriodicalCompilation: boolean;
    doPerformCacheInitialization: boolean;
};

export type Context = {
    paramsOfBootstrapCore: ParamsOfBootstrapCore;
    dbApi: DbApi;
    userApi: UserApi;
    compileData: CompileData;
    getWikidataSoftwareOptions: GetSoftwareExternalDataOptions;
    comptoirDuLibreApi: ComptoirDuLibreApi;
    getWikidataSoftware: GetSoftwareExternalData;
    getSoftwareLatestVersion: GetSoftwareLatestVersion;
};

export type Core = GenericCore<typeof usecases, Context>;

export type State = Core["types"]["State"];
export type Thunks = Core["types"]["Thunks"];
export type CreateEvt = Core["types"]["CreateEvt"];

export async function bootstrapCore(params: ParamsOfBootstrapCore): Promise<{ core: Core; context: Context }> {
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
        getSoftwareLatestVersion,
        getServiceProviders
    });

    const { dbApi, initializeDbApiCache } = createGitDbApi(gitDbApiParams);

    const { userApi, initializeUserApiCache } =
        keycloakUserApiParams === undefined
            ? {
                  "userApi": createObjectThatThrowsIfAccessed<Context["userApi"]>({
                      "debugMessage": "No Keycloak server"
                  }),
                  "initializeUserApiCache": async () => {}
              }
            : createKeycloakUserApi(keycloakUserApiParams);

    const context: Context = {
        "paramsOfBootstrapCore": params,
        dbApi,
        userApi,
        compileData,
        getWikidataSoftwareOptions,
        comptoirDuLibreApi,
        getWikidataSoftware,
        getSoftwareLatestVersion
    };

    const { core, dispatch } = createCore({
        context,
        usecases
    });

    await dispatch(
        usecases.readWriteSillData.protectedThunks.initialize({
            doPerPerformPeriodicalCompilation
        })
    );

    if (doPerformCacheInitialization) {
        console.log("Performing cache initialization...");

        await Promise.all([initializeDbApiCache(), initializeUserApiCache()]);
    }

    return { core, context };
}
