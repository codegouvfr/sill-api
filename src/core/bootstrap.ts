import { createObjectThatThrowsIfAccessed, createCore, type GenericCore } from "redux-clean-architecture";
import { usecases } from "./usecases";

type ParamsOfBootstrapCore = {
    gitDbApiParams: import("./adapters/dbApi").GitDbApiParams;
    keycloakUserApiParams: import("./adapters/userApi").KeycloakUserApiParams | undefined;
    githubPersonalAccessTokenForApiRateLimit: string;
    doPerPerformPeriodicalCompilation: boolean;
    doPerformCacheInitialization: boolean;
};

export type Context = {
    paramsOfBootstrapCore: ParamsOfBootstrapCore;
    dbApi: import("./ports/DbApi").DbApi;
    userApi: import("./ports/UserApi").UserApi;
    compileData: import("./ports/CompileData").CompileData;
    getWikidataSoftwareOptions: import("./ports/GetWikidataSoftwareOptions").GetWikidataSoftwareOptions;
    comptoirDuLibreApi: import("./ports/ComptoirDuLibreApi").ComptoirDuLibreApi;
    getWikidataSoftware: import("./ports/GetSoftwareExternalData").GetSoftwareExternalData;
    getSoftwareLatestVersion: import("./ports/GetSoftwareLatestVersion").GetSoftwareLatestVersion;
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

    const [
        { createGetSoftwareLatestVersion },
        { createCompileData },
        { getWikidataSoftware },
        { getCnllPrestatairesSill },
        { comptoirDuLibreApi },
        { createGitDbApi },
        { createKeycloakUserApi },
        { getWikidataSoftwareOptions },
        { getServiceProviders }
    ] = await Promise.all([
        import("./adapters/getSoftwareLatestVersion"),
        import("./adapters/compileData"),
        import("./adapters/getWikidataSoftware"),
        import("./adapters/getCnllPrestatairesSill"),
        import("./adapters/comptoirDuLibreApi"),
        import("./adapters/dbApi"),
        import("./adapters/userApi"),
        import("./adapters/getWikidataSoftwareOptions"),
        import("./adapters/getServiceProviders")
    ] as const);

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
