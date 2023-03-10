import structuredClone from "@ungap/structured-clone";
import type { Thunks } from "../core";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../core";
import { createSelector } from "@reduxjs/toolkit";
import { createObjectThatThrowsIfAccessed, createUsecaseContextApi } from "redux-clean-architecture";
import { Mutex } from "async-mutex";
import { assert } from "tsafe/assert";
import type { Db } from "../ports/DbApi";
import { type CompiledData, compiledDataPrivateToPublic } from "../ports/CompileData";
import { same } from "evt/tools/inDepth/same";

export type Software = {
    logoUrl: string | undefined;
    softwareId: number;
    softwareName: string;
    softwareDescription: string;
    lastVersion:
        | {
              semVer: string;
              publicationTime: number;
          }
        | undefined;
    parentSoftware: WikidataEntry | undefined;
    testUrl: string | undefined;
    addedTime: number;
    updateTime: number;
    categories: string[];
    prerogatives: Record<Prerogative, boolean>;
    userAndReferentCountByOrganization: Record<string, { userCount: number; referentCount: number }>;
    authors: {
        authorName: string;
        authorUrl: string;
    }[];
    officialWebsiteUrl: string | undefined;
    codeRepositoryUrl: string | undefined;
    versionMin: string;
    license: string;
    serviceProviderCount: number;
    compotoirDuLibreId: number | undefined;
    wikidataId: string | undefined;
    softwareType: SoftwareType;
    similarSoftwares: WikidataEntry[];
};

export type Agent = {
    //NOTE: Undefined if the agent isn't referent of at least one software
    // If it's the user the email is never undefined.
    email: string | undefined;
    organization: string;
    declarations: (DeclarationFormData & { softwareName: string })[];
};

export type Instance = Db.InstanceRow;

export type SoftwareType = SoftwareType.Desktop | SoftwareType.CloudNative | SoftwareType.Stack;

export namespace SoftwareType {
    export type Desktop = {
        type: "desktop";
        os: Record<Os, boolean>;
    };

    export type CloudNative = {
        type: "cloud";
    };

    export type Stack = {
        type: "stack";
    };
}

export type Prerogative = "isPresentInSupportContract" | "isFromFrenchPublicServices" | "doRespectRgaa";

export type WikidataEntry = {
    wikidataLabel: string;
    wikidataDescription: string;
    wikidataId: string;
};

export type Os = "windows" | "linux" | "mac";

export type SoftwareFormData = {
    softwareType: SoftwareType;
    wikidataId?: string;
    comptoirDuLibreId?: number;
    softwareName: string;
    softwareDescription: string;
    softwareLicense: string;
    softwareMinimalVersion: string;
    isPresentInSupportContract: boolean;
    isFromFrenchPublicService: boolean;
    similarSoftwares: WikidataEntry[];
};

export type DeclarationFormData = DeclarationFormData.User | DeclarationFormData.Referent;

export namespace DeclarationFormData {
    export type User = {
        declarationType: "user";
        usecaseDescription: string;
        /** NOTE: undefined if the software is not of type desktop */
        os: Os | undefined;
        version: string;
        /** NOTE: Defined only when software is cloud */
        serviceUrl: string | undefined;
    };

    export type Referent = {
        declarationType: "referent";
        isTechnicalExpert: boolean;
        usecaseDescription: string;
        /** NOTE: Can be not undefined only if cloud */
        serviceUrl: string | undefined;
    };
}

type State = {
    db: Db;
    compiledData: CompiledData<"private">;
};

export const name = "readWriteSillData";

export const { reducer, actions } = createSlice({
    name,
    "initialState": createObjectThatThrowsIfAccessed<State>(),
    "reducers": {
        "updated": (_state, { payload }: PayloadAction<State>) => payload
    }
});

const { getContext } = createUsecaseContextApi(() => ({
    "mutex": new Mutex()
}));

export const privateThunks = {
    "initialize":
        () =>
        async (...args) => {
            const [dispatch, , extraArg] = args;

            const { dbApi } = extraArg;

            const [db, compiledData] = await Promise.all([dbApi.fetchDb(), dbApi.fetchCompiledData()]);

            dispatch(
                actions.updated({
                    db,
                    compiledData
                })
            );

            setInterval(
                () => dispatch(thunks.triggerPeriodicalNonIncrementalCompilation()),
                4 * 3600 * 1000 //4 hour
            );
        }
} satisfies Thunks;

export const thunks = {
    "triggerPeriodicalNonIncrementalCompilation":
        () =>
        async (...args) => {
            const [dispatch, getState, extraArg] = args;

            const { dbApi, compileData } = extraArg;

            const { mutex } = getContext(extraArg);

            const dbBefore = structuredClone(getState()[name].db);

            const newCompiledData = await compileData({
                "db": dbBefore,
                "wikidataCacheCache": undefined
            });

            const wasCanceled = await mutex.runExclusive(async (): Promise<boolean> => {
                if (!same(dbBefore, getState()[name].db)) {
                    return true;
                }

                await dbApi.updateCompiledData({
                    newCompiledData,
                    "commitMessage": "Some Wikidata or other 3rd party source data have changed"
                });

                return false;
            });

            if (wasCanceled) {
                await dispatch(thunks.triggerPeriodicalNonIncrementalCompilation());
            }
        },
    "notifyPushOnMainBranch":
        (params: { commitMessage: string }) =>
        async (...args) => {
            const { commitMessage } = params;

            const [dispatch, , extraArg] = args;

            const { dbApi } = extraArg;

            const { mutex } = getContext(extraArg);

            await mutex.runExclusive(async () =>
                dispatch(
                    localThunks.submitMutation({
                        "newDb": await dbApi.fetchDb(),
                        commitMessage
                    })
                )
            );
        },
    "createSoftware":
        (params: { formData: SoftwareFormData; agent: Db.AgentRow }) =>
        async (...args) => {
            const [dispatch, getState, extraArg] = args;

            const { mutex } = getContext(extraArg);

            const { formData } = params;

            const agentRow = { ...params.agent };

            agentRow.email = agentRow.email.toLowerCase();

            await mutex.runExclusive(async () => {
                const newDb = structuredClone(getState()[name].db);

                const { softwareRows, agentRows } = newDb;

                assert(
                    softwareRows.find(s => {
                        const t = (name: string) => name.toLowerCase().replace(/ /g, "-");
                        return t(s.name) === t(formData.softwareName);
                    }) === undefined,
                    "There is already a software with this name"
                );

                const softwareId =
                    newDb.softwareRows.map(({ id }) => id).reduce((prev, curr) => Math.max(prev, curr), 0) + 1;

                const now = Date.now();

                softwareRows.push({
                    "id": softwareId,
                    "name": formData.softwareName,
                    "function": formData.softwareDescription,
                    "referencedSinceTime": now,
                    "updateTime": now,
                    "dereferencing": undefined,
                    "isStillInObservation": false,
                    "parentSoftware": undefined,
                    "doRespectRgaa": false,
                    "isFromFrenchPublicService": formData.isFromFrenchPublicService,
                    "isPresentInSupportContract": formData.isPresentInSupportContract,
                    "similarSoftwares": formData.similarSoftwares,
                    "wikidataId": formData.wikidataId,
                    "comptoirDuLibreId": formData.comptoirDuLibreId,
                    "license": formData.softwareLicense,
                    "softwareType": formData.softwareType,
                    "catalogNumeriqueGouvFrId": undefined,
                    "versionMin": formData.softwareMinimalVersion,
                    "workshopUrls": [],
                    "testUrls": [],
                    "categories": [],
                    "generalInfoMd": undefined,
                    "addedByAgentEmail": agentRow.email
                });

                if (agentRows.find(({ email }) => email === agentRow.email) === undefined) {
                    agentRows.push(agentRow);
                }

                await dispatch(
                    localThunks.submitMutation({
                        newDb,
                        "commitMessage": `Add software: ${formData.softwareName}`
                    })
                );
            });
        },
    "changeAgentOrganization":
        (params: { userId: string; email: string; newOrganization: string }) =>
        async (...args) => {
            const [dispatch, getState, extraArg] = args;

            const { userApi } = extraArg;

            const { mutex } = getContext(extraArg);

            const { userId, email, newOrganization } = params;

            await userApi.updateUserAgencyName({
                "agencyName": newOrganization,
                userId
            });

            await mutex.runExclusive(async () => {
                const newDb = structuredClone(getState()[name].db);

                const { agentRows } = newDb;

                const agentRow = agentRows.find(row => row.email === email);

                if (agentRow === undefined) {
                    return;
                }

                const { organization: oldOrganization } = agentRow;

                agentRow.organization = newOrganization;

                await dispatch(
                    localThunks.submitMutation({
                        newDb,
                        "commitMessage": `Update ${email} organization from ${oldOrganization} to ${newOrganization}`
                    })
                );
            });
        },
    "updateUserEmail":
        (params: { userId: string; email: string; newEmail: string }) =>
        async (...args) => {
            const [dispatch, getState, extraArg] = args;

            const { userApi } = extraArg;

            const { mutex } = getContext(extraArg);

            const { userId, email, newEmail } = params;

            userApi.updateUserEmail({
                "email": newEmail,
                userId
            });

            await mutex.runExclusive(async () => {
                const newDb = structuredClone(getState()[name].db);

                const { agentRows, softwareReferentRows } = newDb;

                const referent = agentRows.find(row => row.email === email);

                if (referent === undefined) {
                    return;
                }

                referent.email = newEmail;

                softwareReferentRows
                    .filter(({ agentEmail }) => agentEmail === email)
                    .forEach(softwareReferentRow => (softwareReferentRow.agentEmail = newEmail));

                await dispatch(
                    localThunks.submitMutation({
                        newDb,
                        "commitMessage": `Updating referent email from ${email} to ${newEmail}`
                    })
                );
            });
        }
    /*
    "updateSoftware": (params: {
        softwareSillId: number;
        formData: SoftwareFormData;
    }) =>
        async (...args) => {



        },
    "createUserOrReferent": (params: {
        formData: DeclarationFormData;
    }) =>
        async (...args) => {



        },
    "createInstance": (params: CreateInstanceParam) =>
        async (...args) => {



        },
    "updateInstance": (params: CreateInstanceParam & { instanceId: number; }) =>
        async (...args) => {



        }
    */
} satisfies Thunks;

const localThunks = {
    "submitMutation":
        (params: { newDb: Db; commitMessage: string }) =>
        async (...args) => {
            const { newDb, commitMessage } = params;

            const [dispatch, getState, { dbApi, compileData }] = args;

            const state = getState()[name];

            if (same(newDb, state.db)) {
                return;
            }

            //NOTE: It's important to call compileData first as it may crash
            //and if it does it mean that if we have committed we'll end up with
            //inconsistent state.
            const newCompiledData = await compileData({
                "db": newDb,
                "wikidataCacheCache": state.compiledData.catalog
            });

            await Promise.all([
                dbApi.updateDb({ newDb, commitMessage }),
                dbApi.updateCompiledData({ newCompiledData, commitMessage })
            ]);

            dispatch(
                actions.updated({
                    "db": newDb,
                    "compiledData": newCompiledData
                })
            );
        }
} satisfies Thunks;

export const selectors = (() => {
    const sliceState = (state: RootState) => state[name];

    const catalog = createSelector(sliceState, state => state.compiledData.catalog);

    const services = createSelector(sliceState, state => state.compiledData.services);

    const softwares = createSelector(catalog, catalog =>
        catalog.map(
            (o): Software => ({
                "logoUrl": o.wikidataData?.logoUrl,
                "softwareId": o.id,
                "softwareName": o.name,
                "softwareDescription": o.function,
                //TODO: Collect last version
                "lastVersion": undefined,
                "parentSoftware": o.parentSoftware,
                "testUrl": o.testUrls[0]?.url,
                "addedTime": o.referencedSinceTime,
                "updateTime": o.updateTime,
                "categories": o.categories,
                "prerogatives": {
                    "doRespectRgaa": o.doRespectRgaa ?? false,
                    "isFromFrenchPublicServices": o.isFromFrenchPublicService,
                    "isPresentInSupportContract": o.isPresentInSupportContract
                },
                "userAndReferentCountByOrganization": (() => {
                    const out: Software["userAndReferentCountByOrganization"] = {};

                    o.referents.forEach(referent => {
                        const entry = (out[referent.organization] ??= { "referentCount": 0, "userCount": 0 });
                        entry.referentCount++;
                    });
                    o.users.forEach(user => {
                        const entry = (out[user.organization] ??= { "referentCount": 0, "userCount": 0 });
                        entry.userCount++;
                    });

                    return out;
                })(),
                "authors":
                    o.wikidataData?.developers.map(developer => ({
                        "authorName": developer.name,
                        "authorUrl": `https://www.wikidata.org/wiki/${developer.id}`
                    })) ?? [],
                "officialWebsiteUrl": o.wikidataData?.websiteUrl,
                "codeRepositoryUrl": o.wikidataData?.sourceUrl,
                "versionMin": o.versionMin,
                "license": o.license,
                "serviceProviderCount": o.comptoirDuLibreSoftware?.providers.length ?? 0,
                "compotoirDuLibreId": o.comptoirDuLibreSoftware?.id,
                "wikidataId": o.wikidataData?.id,
                "softwareType": o.softwareType,
                "similarSoftwares": o.similarSoftwares
            })
        )
    );

    const instances = createSelector(services, services => services.map((service): Instance => service));

    const compiledDataPublicJson = createSelector(sliceState, state => {
        const { compiledData } = state;

        return JSON.stringify(compiledDataPrivateToPublic(compiledData), null, 2);
    });

    return {
        softwares,
        instances,
        compiledDataPublicJson
    };
})();
