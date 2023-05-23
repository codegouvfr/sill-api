import structuredClone from "@ungap/structured-clone";
import type { Thunks, RootState } from "../core";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "@reduxjs/toolkit";
import { createObjectThatThrowsIfAccessed, createUsecaseContextApi } from "redux-clean-architecture";
import { Mutex } from "async-mutex";
import { assert, type Equals } from "tsafe/assert";
import type { Db } from "../ports/DbApi";
import { type CompiledData, compiledDataPrivateToPublic } from "../ports/CompileData";
import { same } from "evt/tools/inDepth/same";
import { removeDuplicates } from "evt/tools/reducers/removeDuplicates";
import { Deferred } from "evt/tools/Deferred";
import { thunks as suggestionAndAutoFillThunks } from "./suggestionAndAutoFill";

export type Software = {
    logoUrl: string | undefined;
    softwareId: number;
    softwareName: string;
    softwareDescription: string;
    latestVersion:
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
    comptoirDuLibreServiceProviderCount: number;
    annuaireCnllServiceProviders:
        | {
              name: string;
              siren: string;
              url: string;
          }[]
        | undefined;
    compotoirDuLibreId: number | undefined;
    wikidataId: string | undefined;
    softwareType: SoftwareType;
    similarSoftwares: WikidataEntry[];
    keywords: string[];
};

export type Agent = {
    //NOTE: Undefined if the agent isn't referent of at least one software
    // If it's the user the email is never undefined.
    email: string | undefined;
    organization: string;
    declarations: (DeclarationFormData & { softwareName: string })[];
};

export type Instance = {
    id: number;
    mainSoftwareSillId: number;
    organization: string;
    targetAudience: string;
    publicUrl: string | undefined;
    otherSoftwares: WikidataEntry[];
};

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
    wikidataId: string | undefined;
    comptoirDuLibreId: number | undefined;
    softwareName: string;
    softwareDescription: string;
    softwareLicense: string;
    softwareMinimalVersion: string;
    isPresentInSupportContract: boolean;
    isFromFrenchPublicService: boolean;
    similarSoftwares: WikidataEntry[];
    softwareLogoUrl: string | undefined;
    softwareKeywords: string[];
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

export type InstanceFormData = {
    mainSoftwareSillId: number;
    organization: string;
    targetAudience: string;
    publicUrl: string | undefined;
    otherSoftwares: WikidataEntry[];
};

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
        (params: { doPerformPeriodicalUpdate: boolean }) =>
        async (...args) => {
            const { doPerformPeriodicalUpdate } = params;

            const [dispatch, , extraArg] = args;

            const { dbApi } = extraArg;

            const [db, compiledData] = await Promise.all([dbApi.fetchDb(), dbApi.fetchCompiledData()]);

            dispatch(
                actions.updated({
                    db,
                    compiledData
                })
            );

            periodical_update: {
                if (!doPerformPeriodicalUpdate) {
                    console.log("Periodical update disabled");
                    break periodical_update;
                }

                dispatch(localThunks.triggerNonIncrementalCompilation({ "triggerType": "initial" }));

                setInterval(
                    () => dispatch(localThunks.triggerNonIncrementalCompilation({ "triggerType": "periodical" })),
                    4 * 3600 * 1000 //4 hour
                );
            }
        },
    /** Functions that returns logoUrlFromFormData if it's not the same as the one from the automatic suggestions */
    "getStorableLogo":
        (params: { logoUrlFromFormData: string | undefined; wikidataId: string | undefined }) =>
        async (...args): Promise<string | undefined> => {
            const { logoUrlFromFormData, wikidataId } = params;

            const [dispatch] = args;

            if (logoUrlFromFormData === undefined) {
                return undefined;
            }

            if (wikidataId === undefined) {
                return logoUrlFromFormData;
            }

            const softwareFormAutoFillData = await dispatch(
                suggestionAndAutoFillThunks.getSoftwareFormAutoFillDataFromWikidataAndOtherSources({
                    wikidataId
                })
            );

            if (softwareFormAutoFillData.softwareLogoUrl === logoUrlFromFormData) {
                return undefined;
            }

            return logoUrlFromFormData;
        }
} satisfies Thunks;

export const thunks = {
    "manuallyTriggerNonIncrementalCompilation":
        () =>
        async (...args) => {
            const [dispatch] = args;

            await dispatch(localThunks.triggerNonIncrementalCompilation({ "triggerType": "manual" }));
        },
    "notifyPushOnMainBranch":
        (params: { commitMessage: string }) =>
        async (...args) => {
            const { commitMessage } = params;

            const [dispatch, , { dbApi }] = args;

            await dispatch(
                localThunks.transaction(async () => ({
                    "newDb": await dbApi.fetchDb(),
                    commitMessage
                }))
            );
        },
    "createSoftware":
        (params: { formData: SoftwareFormData; agent: { email: string; organization: string } }) =>
        async (...args) => {
            const [dispatch] = args;

            const { formData } = params;

            const agentRow = { ...params.agent };

            await dispatch(
                localThunks.transaction(async newDb => {
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
                        "description": formData.softwareDescription,
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
                        "addedByAgentEmail": agentRow.email,
                        "logoUrl": await dispatch(
                            privateThunks.getStorableLogo({
                                "wikidataId": formData.wikidataId,
                                "logoUrlFromFormData": formData.softwareLogoUrl
                            })
                        ),
                        "keywords": formData.softwareKeywords
                    });

                    if (agentRows.find(({ email }) => email === agentRow.email) === undefined) {
                        agentRows.push(agentRow);
                    }

                    return {
                        newDb,
                        "commitMessage": `Add software: ${formData.softwareName}`
                    };
                })
            );
        },
    "updateSoftware":
        (params: {
            softwareSillId: number;
            formData: SoftwareFormData;
            agent: { email: string; organization: string };
        }) =>
        async (...args): Promise<void> => {
            const [dispatch] = args;

            const { softwareSillId, formData, agent } = params;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { softwareRows, softwareReferentRows } = newDb;

                    assert(
                        softwareReferentRows.find(({ agentEmail }) => agentEmail === agentEmail) !== undefined,
                        "The user is not a referent of this software"
                    );

                    const index = softwareRows.findIndex(softwareRow => softwareRow.id === softwareSillId);

                    assert(index !== -1, "The software does not exist");

                    {
                        const {
                            id,
                            referencedSinceTime,
                            dereferencing,
                            isStillInObservation,
                            parentSoftware,
                            doRespectRgaa,
                            addedByAgentEmail,
                            catalogNumeriqueGouvFrId,
                            categories,
                            generalInfoMd,
                            testUrls,
                            workshopUrls
                        } = softwareRows[index];

                        const {
                            comptoirDuLibreId,
                            isFromFrenchPublicService,
                            isPresentInSupportContract,
                            similarSoftwares,
                            softwareDescription,
                            softwareLicense,
                            softwareMinimalVersion,
                            softwareName,
                            softwareType,
                            wikidataId,
                            softwareLogoUrl,
                            softwareKeywords,
                            ...rest
                        } = formData;

                        assert<Equals<typeof rest, {}>>();

                        softwareRows[index] = {
                            id,
                            referencedSinceTime,
                            "updateTime": Date.now(),
                            dereferencing,
                            isStillInObservation,
                            parentSoftware,
                            doRespectRgaa,
                            addedByAgentEmail,
                            catalogNumeriqueGouvFrId,
                            categories,
                            generalInfoMd,
                            testUrls,
                            workshopUrls,
                            comptoirDuLibreId,
                            isFromFrenchPublicService,
                            isPresentInSupportContract,
                            similarSoftwares,
                            "description": softwareDescription,
                            "license": softwareLicense,
                            "versionMin": softwareMinimalVersion,
                            "name": softwareName,
                            "softwareType": softwareType,
                            "wikidataId": wikidataId,
                            "logoUrl": await dispatch(
                                privateThunks.getStorableLogo({
                                    wikidataId,
                                    "logoUrlFromFormData": formData.softwareLogoUrl
                                })
                            ),
                            "keywords": softwareKeywords
                        };
                    }

                    return {
                        "commitMessage": `${softwareRows[index].name} updated by ${agent.email}`,
                        newDb
                    };
                })
            );
        },
    "createUserOrReferent":
        (params: {
            softwareName: string;
            formData: DeclarationFormData;
            agent: { email: string; organization: string };
        }) =>
        async (...args): Promise<void> => {
            const [dispatch] = args;

            const { formData, softwareName, agent } = params;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { agentRows, softwareReferentRows, softwareUserRows, softwareRows } = newDb;

                    const softwareRow = softwareRows.find(row => row.name === softwareName);

                    assert(softwareRow !== undefined, "Software not in SILL");

                    if (agentRows.find(row => row.email === agent.email) === undefined) {
                        agentRows.push({
                            "email": agent.email,
                            "organization": agent.organization
                        });
                    }

                    switch (formData.declarationType) {
                        case "referent":
                            {
                                assert(
                                    softwareReferentRows.find(
                                        row => row.softwareId === softwareRow.id && row.agentEmail === agent.email
                                    ) === undefined,
                                    "Agent already referent of this software"
                                );

                                softwareReferentRows.push({
                                    "softwareId": softwareRow.id,
                                    "agentEmail": agent.email,
                                    "isExpert": formData.isTechnicalExpert,
                                    "serviceUrl": formData.serviceUrl,
                                    "useCaseDescription": formData.usecaseDescription
                                });
                            }
                            break;
                        case "user":
                            {
                                assert(
                                    softwareUserRows.find(
                                        row => row.softwareId === softwareRow.id && row.agentEmail === agent.email
                                    ) === undefined,
                                    "Agent already declared as user of this software"
                                );

                                softwareUserRows.push({
                                    "softwareId": softwareRow.id,
                                    "agentEmail": agent.email,
                                    "os": formData.os,
                                    "serviceUrl": formData.serviceUrl,
                                    "useCaseDescription": formData.usecaseDescription,
                                    "version": formData.version
                                });
                            }
                            break;
                    }

                    return {
                        newDb,
                        "commitMessage": `Add ${agent.email} as ${formData.declarationType} of ${softwareName}`
                    };
                })
            );
        },
    "removeUserOrReferent":
        (params: { softwareName: string; declarationType: "user" | "referent"; agentEmail: string }) =>
        async (...args): Promise<void> => {
            const [dispatch] = args;

            const { softwareName, declarationType, agentEmail } = params;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { agentRows, softwareReferentRows, softwareUserRows, softwareRows, instanceRows } = newDb;

                    const softwareRow = softwareRows.find(row => row.name === softwareName);

                    assert(softwareRow !== undefined, `There is no ${softwareName} in SILL`);

                    const softwareDeclarationRows = ((): { agentEmail: string; softwareId: number }[] => {
                        switch (declarationType) {
                            case "referent":
                                return softwareReferentRows;
                            case "user":
                                return softwareUserRows;
                        }
                    })();

                    const softwareDeclarationRow = softwareDeclarationRows.find(
                        row => row.agentEmail === agentEmail && row.softwareId === softwareRow.id
                    );

                    assert(
                        softwareDeclarationRow !== undefined,
                        `There is no ${agentEmail} as ${declarationType} of ${softwareName}`
                    );

                    softwareDeclarationRows.splice(softwareDeclarationRows.indexOf(softwareDeclarationRow), 1);

                    remove_agent_if_no_longer_referenced_anywhere: {
                        if (softwareReferentRows.find(row => row.agentEmail === agentEmail) !== undefined) {
                            break remove_agent_if_no_longer_referenced_anywhere;
                        }

                        if (softwareUserRows.find(row => row.agentEmail === agentEmail) !== undefined) {
                            break remove_agent_if_no_longer_referenced_anywhere;
                        }

                        if (softwareRows.find(row => row.addedByAgentEmail === agentEmail) !== undefined) {
                            break remove_agent_if_no_longer_referenced_anywhere;
                        }

                        if (instanceRows.find(row => row.addedByAgentEmail === agentEmail) !== undefined) {
                            break remove_agent_if_no_longer_referenced_anywhere;
                        }

                        const agentRow = agentRows.find(row => row.email === agentEmail);

                        assert(agentRow !== undefined, `There is no ${agentEmail} in the database`);

                        agentRows.splice(agentRows.indexOf(agentRow), 1);
                    }

                    return {
                        newDb,
                        "commitMessage": `Remove ${agentEmail} as ${declarationType} of ${softwareName}`
                    };
                })
            );
        },
    "createInstance":
        (params: { formData: InstanceFormData; agent: { email: string; organization: string } }) =>
        async (...args): Promise<{ instanceId: number }> => {
            const { agent, formData } = params;

            const [dispatch] = args;

            const dInstanceId = new Deferred<{ instanceId: number }>();

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { instanceRows, softwareRows } = newDb;

                    {
                        const fmtUrl = (url: string | undefined) =>
                            url === undefined ? {} : url.toLowerCase().replace(/\/$/, "");

                        assert(
                            instanceRows.find(
                                row =>
                                    row.mainSoftwareSillId === formData.mainSoftwareSillId &&
                                    fmtUrl(row.publicUrl) === fmtUrl(formData.publicUrl)
                            ) === undefined,
                            "This instance is already referenced"
                        );
                    }

                    const softwareRow = softwareRows.find(row => row.id === formData.mainSoftwareSillId);

                    assert(softwareRow !== undefined, "Can't create instance, software not in SILL");

                    const instanceId =
                        instanceRows.map(({ id }) => id).reduce((prev, curr) => Math.max(prev, curr), 0) + 1;

                    dInstanceId.resolve({ instanceId });

                    const now = Date.now();

                    instanceRows.push({
                        "id": instanceId,
                        "addedByAgentEmail": agent.email,
                        "organization": formData.organization,
                        "mainSoftwareSillId": formData.mainSoftwareSillId,
                        "otherSoftwares": formData.otherSoftwares,
                        "publicUrl": formData.publicUrl,
                        "targetAudience": formData.targetAudience,
                        "referencedSinceTime": now,
                        "updateTime": now
                    });

                    return {
                        newDb,
                        "commitMessage": `Adding ${softwareRow.name} instance: ${formData.publicUrl}`
                    };
                })
            );

            return dInstanceId.pr;
        },
    "updateInstance":
        (params: { instanceId: number; formData: InstanceFormData; agentEmail: string }) =>
        async (...args): Promise<void> => {
            const { instanceId, formData, agentEmail } = params;

            const [dispatch] = args;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { instanceRows } = newDb;

                    const index = instanceRows.findIndex(row => row.id === instanceId);

                    assert(index !== -1, "Can't update instance, it doesn't exist");

                    const { mainSoftwareSillId, organization, otherSoftwares, publicUrl, targetAudience, ...rest } =
                        formData;

                    assert<Equals<typeof rest, {}>>();

                    const { id, addedByAgentEmail, referencedSinceTime } = instanceRows[index];

                    instanceRows[index] = {
                        id,
                        addedByAgentEmail,
                        mainSoftwareSillId,
                        organization,
                        otherSoftwares,
                        publicUrl,
                        targetAudience,
                        referencedSinceTime,
                        "updateTime": Date.now()
                    };

                    return {
                        newDb,
                        "commitMessage": `Instance ${formData.publicUrl} updated by ${agentEmail}`
                    };
                })
            );
        },
    "changeAgentOrganization":
        (params: { userId: string; email: string; newOrganization: string }) =>
        async (...args) => {
            const [dispatch, , extraArg] = args;

            const { userApi } = extraArg;

            const { userId, email, newOrganization } = params;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { agentRows } = newDb;

                    const agentRow = agentRows.find(row => row.email === email);

                    if (agentRow === undefined) {
                        return;
                    }

                    const { organization: oldOrganization } = agentRow;

                    agentRow.organization = newOrganization;

                    return {
                        "result": undefined,
                        newDb,
                        "commitMessage": `Update ${email} organization from ${oldOrganization} to ${newOrganization}`
                    };
                })
            );

            await userApi.updateUserOrganization({
                "organization": newOrganization,
                userId
            });
        },
    "updateUserEmail":
        (params: { userId: string; email: string; newEmail: string }) =>
        async (...args) => {
            const [dispatch, , extraArg] = args;

            const { userApi } = extraArg;

            const { userId, email, newEmail } = params;

            await dispatch(
                localThunks.transaction(async newDb => {
                    const { agentRows, softwareReferentRows, softwareUserRows, softwareRows } = newDb;

                    const agent = agentRows.find(row => row.email === email);

                    if (agent === undefined) {
                        return;
                    }

                    agent.email = newEmail;

                    softwareReferentRows
                        .filter(({ agentEmail }) => agentEmail === email)
                        .forEach(softwareReferentRow => (softwareReferentRow.agentEmail = newEmail));

                    softwareUserRows
                        .filter(({ agentEmail }) => agentEmail === email)
                        .forEach(softwareUserRow => (softwareUserRow.agentEmail = newEmail));

                    softwareRows.filter(({ addedByAgentEmail }) => addedByAgentEmail === newEmail);

                    return {
                        "commitMessage": `Updating referent email from ${email} to ${newEmail}`,
                        newDb
                    };
                })
            );

            await userApi.updateUserEmail({
                "email": newEmail,
                userId
            });
        }
} satisfies Thunks;

const localThunks = {
    "transaction":
        (asyncReducer: (dbClone: Db) => Promise<{ newDb: Db; commitMessage: string } | undefined>) =>
        async (...args): Promise<void> => {
            const [dispatch, getState, extraArg] = args;

            const { compileData, dbApi } = extraArg;

            const { mutex } = getContext(extraArg);

            await mutex.runExclusive(async () => {
                let newDb = structuredClone(getState()[name].db);

                const reducerReturnValue = await asyncReducer(newDb);

                if (reducerReturnValue === undefined) {
                    return;
                }

                const { commitMessage, newDb: newDbReturnedByReducer } = reducerReturnValue;

                if (newDbReturnedByReducer !== undefined) {
                    newDb = newDbReturnedByReducer;
                }

                const state = getState()[name];

                if (same(newDb, state.db)) {
                    return;
                }

                //NOTE: It's important to call compileData first as it may crash
                //and if it does it mean that if we have committed we'll end up with
                //inconsistent state.
                const newCompiledData = await compileData({
                    "db": newDb,
                    "cache": Object.fromEntries(
                        state.compiledData.map(({ id, wikidataSoftware, latestVersion, comptoirDuLibreSoftware }) => [
                            id,
                            {
                                wikidataSoftware,
                                latestVersion,
                                "comptoirDuLibreLogoUrl": comptoirDuLibreSoftware?.logoUrl,
                                "comptoirDuLibreKeywords": comptoirDuLibreSoftware?.keywords
                            }
                        ])
                    )
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
            });
        },
    "triggerNonIncrementalCompilation":
        (params: { triggerType: "periodical" | "manual" | "initial" }) =>
        async (...args) => {
            console.log("Starting non incremental compilation");

            const { triggerType } = params;

            const [dispatch, getState, extraArg] = args;

            const { dbApi, compileData } = extraArg;

            const { mutex } = getContext(extraArg);

            const dbBefore = structuredClone(getState()[name].db);

            const newCompiledData = await compileData({
                "db": dbBefore,
                "cache": {}
            });

            const wasCanceled = await mutex.runExclusive(async (): Promise<boolean> => {
                const { db } = getState()[name];

                if (!same(dbBefore, db)) {
                    //While we where re compiling there was some other transaction,
                    //Re-scheduling.
                    console.log(
                        "Re-scheduling non incremental compilation, db has changed (probably due to a concurrent transaction)"
                    );
                    return true;
                }

                await dbApi.updateCompiledData({
                    newCompiledData,
                    "commitMessage": (() => {
                        switch (triggerType) {
                            case "initial":
                                return "Some data have changed while the backend was down";
                            case "periodical":
                                return "Periodical update: Some Wikidata or other 3rd party source data have changed";
                            case "manual":
                                return "Manual trigger: Some data have changed since last compilation";
                        }
                    })()
                });

                dispatch(
                    actions.updated({
                        db,
                        "compiledData": newCompiledData
                    })
                );

                return false;
            });

            if (wasCanceled) {
                console.log("Data have changed, re-scheduling non incremental compilation");
                await dispatch(localThunks.triggerNonIncrementalCompilation(params));
            }

            console.log("Done with non incremental compilation");
        }
} satisfies Thunks;

export const selectors = (() => {
    const sliceState = (state: RootState) => state[name];

    const compiledData = createSelector(sliceState, state => state.compiledData);

    const softwares = createSelector(compiledData, compiledData =>
        compiledData.map(
            (o): Software => ({
                "logoUrl": o.logoUrl ?? o.wikidataSoftware?.logoUrl ?? o.comptoirDuLibreSoftware?.logoUrl,
                "softwareId": o.id,
                "softwareName": o.name,
                "softwareDescription": o.description,
                "latestVersion": o.latestVersion,
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
                    o.wikidataSoftware?.developers.map(developer => ({
                        "authorName": developer.name,
                        "authorUrl": `https://www.wikidata.org/wiki/${developer.id}`
                    })) ?? [],
                "officialWebsiteUrl":
                    o.wikidataSoftware?.websiteUrl ?? o.comptoirDuLibreSoftware?.external_resources.website,
                "codeRepositoryUrl":
                    o.wikidataSoftware?.sourceUrl ?? o.comptoirDuLibreSoftware?.external_resources.repository,
                "versionMin": o.versionMin,
                "license": o.license,
                "comptoirDuLibreServiceProviderCount": o.comptoirDuLibreSoftware?.providers.length ?? 0,
                "annuaireCnllServiceProviders": o.annuaireCnllServiceProviders,
                "compotoirDuLibreId": o.comptoirDuLibreSoftware?.id,
                "wikidataId": o.wikidataSoftware?.id,
                "softwareType": o.softwareType,
                "similarSoftwares": o.similarSoftwares,
                "keywords": [...o.keywords, ...(o.comptoirDuLibreSoftware?.keywords ?? [])].reduce(
                    ...removeDuplicates<string>((k1, k2) => k1.toLowerCase() === k2.toLowerCase())
                )
            })
        )
    );

    const instances = createSelector(compiledData, (compiledData): Instance[] =>
        compiledData
            .map(software => software.instances.map(instance => ({ ...instance, "mainSoftwareSillId": software.id })))
            .flat()
            .map(
                ({
                    id,
                    organization,
                    targetAudience,
                    publicUrl,
                    otherSoftwares,
                    addedByAgentEmail,
                    mainSoftwareSillId
                }) => ({
                    id,
                    mainSoftwareSillId,
                    organization,
                    targetAudience,
                    publicUrl,
                    otherSoftwares,
                    addedByAgentEmail
                })
            )
    );

    const agents = createSelector(sliceState, state =>
        state.db.agentRows.map((agentRow): Agent => {
            const getSoftwareName = (softwareId: number) => {
                const row = state.db.softwareRows.find(row => row.id === softwareId);

                assert(row !== undefined);

                return row.name;
            };

            return {
                "email": agentRow.email,
                "declarations": [
                    ...state.db.softwareUserRows
                        .filter(row => row.agentEmail === agentRow.email)
                        .map((row): DeclarationFormData.User & { softwareName: string } => ({
                            "declarationType": "user",
                            "usecaseDescription": row.useCaseDescription,
                            "os": row.os,
                            "version": row.version,
                            "serviceUrl": row.serviceUrl,
                            "softwareName": getSoftwareName(row.softwareId)
                        })),
                    ...state.db.softwareReferentRows
                        .filter(row => row.agentEmail === agentRow.email)
                        .map((row): DeclarationFormData.Referent & { softwareName: string } => ({
                            "declarationType": "referent",
                            "isTechnicalExpert": row.isExpert,
                            "usecaseDescription": row.useCaseDescription,
                            "serviceUrl": row.serviceUrl,
                            "softwareName": getSoftwareName(row.softwareId)
                        }))
                ],
                "organization": agentRow.organization
            };
        })
    );

    const referentCount = createSelector(
        agents,
        agents =>
            agents
                .filter(
                    agent =>
                        agent.declarations.find(declaration => declaration.declarationType === "referent") !== undefined
                )
                .map(agent => agent.email)
                .reduce(...removeDuplicates()).length
    );

    const compiledDataPublicJson = createSelector(sliceState, state => {
        const { compiledData } = state;

        return JSON.stringify(compiledDataPrivateToPublic(compiledData), null, 2);
    });

    return {
        softwares,
        instances,
        agents,
        referentCount,
        compiledDataPublicJson
    };
})();
