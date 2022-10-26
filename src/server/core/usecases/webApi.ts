import structuredClone from "@ungap/structured-clone";
import type { Thunks } from "../setup";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { State } from "../setup";
import { createSelector } from "@reduxjs/toolkit";
import { Db } from "../ports/DbApi";
import { CompiledData } from "../../../model/types";
import { createObjectThatThrowsIfAccessed, createUsecaseContextApi } from "redux-clean-architecture";
import { Mutex } from "async-mutex";
import { assert } from "tsafe/assert";
import type {
    SoftwareRow,
    ReferentRow,
} from "../../../model/types";
import { buildCatalog } from "../../../model/buildCatalog";
import { buildServices } from "../../../model/buildServices";
import { zSoftwareRow } from "../../../model/z";
import type { Equals } from "tsafe";
import { removeReferent } from "../../../model/types";
import { z } from "zod";
import { id } from "tsafe/id";

type SoftwareRowKeyEditableByForm =
    | "name"
    | "function"
    | "isFromFrenchPublicService"
    | "wikidataId"
    | "comptoirDuLibreId"
    | "license"
    | "versionMin"
    | "agentWorkstation"
    | "tags"
    | "alikeSoftwares"
    | "generalInfoMd";

assert<SoftwareRowKeyEditableByForm extends keyof SoftwareRow ? true : false>();

type SoftwareRowEditableByForm = Pick<
    SoftwareRow,
    SoftwareRowKeyEditableByForm
>;

export const zSoftwareRowEditableByForm = zSoftwareRow.pick({
    "name": true,
    "function": true,
    "isFromFrenchPublicService": true,
    "wikidataId": true,
    "comptoirDuLibreId": true,
    "license": true,
    "versionMin": true,
    "agentWorkstation": true,
    "tags": true,
    "alikeSoftwares": true,
    "generalInfoMd": true,
});

{
    type Got = ReturnType<typeof zSoftwareRowEditableByForm["parse"]>;
    type Expected = SoftwareRowEditableByForm;

    assert<Equals<Got, Expected>>();
}

export type ServiceFormData = {
    serviceUrl: string;
    description: string;
    agencyName: string;
    deployedSoftware:
    | {
        isInSill: false;
        softwareName: string;
    }
    | {
        isInSill: true;
        softwareSillId: number;
    };
};

export const zServiceFormData = z.object({
    "serviceUrl": z.string(),
    "description": z.string(),
    "agencyName": z.string(),
    "deployedSoftware": z.union([
        z.object({
            "isInSill": z.literal(false),
            "softwareName": z.string(),
        }),
        z.object({
            "isInSill": z.literal(true),
            "softwareSillId": z.number(),
        }),
    ]),
});

{
    type Got = ReturnType<typeof zServiceFormData["parse"]>;
    type Expected = ServiceFormData;

    assert<Equals<Got, Expected>>();
}



type WebApiState = {
    db: Db;
    compiledData: CompiledData<"with referents">;
};

export const name = "webApi";

export const { reducer, actions } = createSlice({
    name,
    "initialState": createObjectThatThrowsIfAccessed<WebApiState>(),
    "reducers": {
        "stateUpdated": (_state, { payload }: PayloadAction<WebApiState>) => payload,
    },
});


const { getContext } = createUsecaseContextApi(() => ({
    "mutex": new Mutex(),
    "sillJsonBuffer": createObjectThatThrowsIfAccessed<Buffer>()
}));

export const privateThunks = {
    "initialize": () => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { dbApi, evtAction } = extraArg;

        const [db, compiledData] = await Promise.all([
            dbApi.fetchDb(),
            dbApi.fetchCompiledData()
        ]);

        dispatch(actions.stateUpdated({
            db,
            compiledData
        }));

        evtAction
            .pipe(action => action.sliceName !== "webApi" ? null : [undefined])
            .toStateful()
            .pipe(
                () => [
                    Buffer.from(
                        JSON.stringify(selectors.compiledDataWithoutReferents(getState()),
                            null,
                            2
                        )
                        , "utf8"),
                ],
            )
            .attach(buff => getContext(extraArg).sillJsonBuffer = buff);

    },
    "updateStateRemoteAndLocal": (params: { newDb: Db; commitMessage: string; }) => async (...args) => {

        const { newDb, commitMessage } = params;

        const [dispatch, getState, { dbApi }] = args;

        const newCompiledData: CompiledData<"with referents"> = {
            ...getState().webApi.compiledData,
            //NOTE: It's important to call buildCatalog first as it may crash
            //and if it does it mean that if we have committed we'll end up with
            //inconsistent state.
            "catalog": await buildCatalog({
                "currentCatalog": getState().webApi.compiledData.catalog,
                ...newDb,
            }).then(({ catalog }) => catalog),
            "services": await buildServices({
                "serviceRows": newDb.serviceRows,
            }).then(({ services }) => services)
        };

        await dbApi.updateDb({ newDb, commitMessage });

        dispatch(actions.stateUpdated({
            "db": newDb,
            "compiledData": newCompiledData
        }));

    },
} satisfies Thunks;

export const thunks = {
    "refreshRemoteData": () => async (...args) => {

        const [dispatch, , extraArg] = args;

        const { mutex } = getContext(extraArg);

        await mutex.runExclusive(async () => {

            const { dbApi } = extraArg;

            dispatch(
                actions.stateUpdated({
                    "db": await dbApi.fetchDb(),
                    "compiledData": await dbApi.fetchCompiledData()
                })
            );

        });

    },
    "createReferent": (params: {
        referentRow: ReferentRow;
        softwareId: number;
        isExpert: boolean;
        useCaseDescription: string;
        isPersonalUse: boolean;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { referentRow, softwareId, isExpert, useCaseDescription, isPersonalUse } = params;

        await mutex.runExclusive(async () => {

            let commitMessage = "";

            const newDb = structuredClone(getState().webApi.db);

            const { referentRows, softwareRows, softwareReferentRows } =
                newDb;

            {
                const softwareRow = softwareRows.find(
                    ({ id }) => id === softwareId,
                );

                assert(softwareRow !== undefined);

                commitMessage = `Add referent ${referentRow.email} to software ${softwareRow.name}`;
            }

            if (
                referentRows.find(
                    ({ email }) => referentRow.email === email,
                ) === undefined
            ) {
                referentRows.push(referentRow);
            }

            const softwareReferentRow = softwareReferentRows.find(
                softwareReferentRow =>
                    referentRow.email ===
                    softwareReferentRow.referentEmail &&
                    softwareReferentRow.softwareId === softwareId,
            );

            if (softwareReferentRow !== undefined) {
                if (softwareReferentRow.isExpert === isExpert) {
                    return undefined;
                }

                softwareReferentRow.isExpert = isExpert;
            } else {
                softwareReferentRows.push({
                    "referentEmail": referentRow.email,
                    softwareId,
                    isExpert,
                    useCaseDescription,
                    isPersonalUse,
                });
            }

            await dispatch(
                privateThunks.updateStateRemoteAndLocal({
                    newDb,
                    commitMessage,
                })
            );

        });


    },
    "userNoLongerReferent": (params: { email: string; softwareId: number; }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, softwareId } = params;

        await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            let commitMessage = "";

            const { referentRows, softwareReferentRows, softwareRows } =
                newDb;

            {
                const softwareRow = softwareRows.find(
                    ({ id }) => id === softwareId,
                );

                assert(softwareRow !== undefined);

                commitMessage = `Remove referent ${email} from software ${softwareRow.name}`;
            }

            const index = softwareReferentRows.findIndex(
                softwareReferentRow =>
                    softwareReferentRow.softwareId === softwareId &&
                    softwareReferentRow.referentEmail === email,
            );

            if (index === -1) {
                return undefined;
            }

            softwareReferentRows.splice(index, 1);

            if (
                softwareReferentRows.find(
                    softwareReferentRow =>
                        softwareReferentRow.referentEmail === email,
                ) === undefined
            ) {
                const index = referentRows.findIndex(
                    referentRow => referentRow.email === email,
                );

                assert(index !== -1);

                referentRows.splice(index, 1);
            }

            await dispatch(
                privateThunks.updateStateRemoteAndLocal({
                    newDb,
                    commitMessage,
                })
            );

        });
    },
    "addSoftware": (params: {
        softwareRowEditableByForm: SoftwareRowEditableByForm;
        referentRow: ReferentRow;
        isExpert: boolean;
        useCaseDescription: string;
        isPersonalUse: boolean;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { isExpert, isPersonalUse, referentRow, softwareRowEditableByForm, useCaseDescription } = params;

        const { software } = await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { referentRows, softwareRows, softwareReferentRows } =
                newDb;

            assert(
                softwareRows.find(s => {
                    const t = (name: string) =>
                        name.toLowerCase().replace(/ /g, "-");
                    return (
                        t(s.name) === t(softwareRowEditableByForm.name)
                    );
                }) === undefined,
                "There is already a software with this name",
            );

            const softwareId =
                newDb.softwareRows
                    .map(({ id }) => id)
                    .reduce((prev, curr) => Math.max(prev, curr), 0) +
                1;

            softwareRows.push({
                "id": softwareId,
                "referencedSinceTime": Date.now(),
                "isStillInObservation": false,
                "isPresentInSupportContract": false,
                "mimGroup": "MIMO",
                "workshopUrls": [],
                "testUrls": [],
                "useCaseUrls": [],
                ...softwareRowEditableByForm,
            });

            if (
                referentRows.find(
                    ({ email }) => referentRow.email === email,
                ) === undefined
            ) {
                referentRows.push(referentRow);
            }

            softwareReferentRows.push({
                softwareId,
                "referentEmail": referentRow.email,
                isExpert,
                useCaseDescription,
                isPersonalUse,
            });

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Add ${softwareRowEditableByForm.name} and ${referentRow.email} as referent`,
            }));

            const software = getState().webApi.compiledData.catalog.find(
                software => software.id === softwareId,
            );

            assert(software !== undefined);

            return { software };

        });

        return { software };

    },
    "updateSoftware": (params: {
        softwareId: number;
        softwareRowEditableByForm: SoftwareRowEditableByForm;
        email: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, softwareId, softwareRowEditableByForm } = params;

        const { software } = await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { softwareRows, softwareReferentRows } = newDb;

            assert(
                softwareReferentRows.find(
                    ({ referentEmail }) => referentEmail === email,
                ) !== undefined,
                "The user is not a referent of this software",
            );

            const index = softwareRows.findIndex(
                softwareRow => softwareRow.id === softwareId,
            );

            assert(index !== -1, "The software does not exist");

            softwareRows[index] = {
                ...softwareRows[index],
                ...structuredClone(softwareRowEditableByForm),
            };

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Update ${softwareRows[index].name}`,
            }));

            const software = getState().webApi.compiledData.catalog.find(
                software => software.id === softwareId,
            );

            assert(software !== undefined);

            return { software };


        });

        return { software };

    },
    "dereferenceSoftware": (params: {
        softwareId: number;
        email: string;
        dereferencing: {
            reason?: string;
            time: number;
            lastRecommendedVersion?: string;
        };
        isDeletion: boolean;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { dereferencing, email, isDeletion, softwareId } = params;

        await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { softwareRows, softwareReferentRows } = newDb;

            assert(
                softwareReferentRows.find(
                    ({ referentEmail }) => referentEmail === email,
                ) !== undefined,
                "The user is not a referent of this software",
            );

            const index = softwareRows.findIndex(
                softwareRow => softwareRow.id === softwareId,
            );

            assert(index !== -1, "The software does not exist");

            if (isDeletion) {
                const { name, id } = softwareRows[index];

                softwareRows.splice(index, 1);

                softwareReferentRows
                    .filter(
                        softwareReferentRow =>
                            softwareReferentRow.softwareId === id,
                    )
                    .forEach(softwareReferentRow =>
                        softwareReferentRows.splice(
                            softwareReferentRows.indexOf(
                                softwareReferentRow,
                            ),
                            1,
                        ),
                    );

                await dispatch(privateThunks.updateStateRemoteAndLocal({
                    newDb,
                    "commitMessage": `${email} delete ${name}: ${dereferencing.reason ?? ""
                        }`,
                }));

                return;
            }

            softwareRows[index].dereferencing =
                structuredClone(dereferencing);

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `${email} dereference ${softwareRows[index].name}`,
            }));


        });

    },
    "changeUserAgencyName": (params: {
        email: string;
        newAgencyName: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, newAgencyName } = params;

        await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { referentRows } = newDb;

            const referent = referentRows.find(
                row => row.email === email,
            );

            if (referent === undefined) {
                return;
            }

            const { agencyName } = referent;

            referent.agencyName = newAgencyName;

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Update ${email} agencyName from ${agencyName} to ${newAgencyName}`,
            }));


        });

    },
    "updateUserEmail": (params: {
        email: string;
        newEmail: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, newEmail } = params;

        await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { referentRows, softwareReferentRows } = newDb;

            const referent = referentRows.find(
                row => row.email === email,
            );

            if (referent === undefined) {
                return;
            }

            referent.email = newEmail;

            softwareReferentRows
                .filter(({ referentEmail }) => referentEmail === email)
                .forEach(
                    softwareReferentRow =>
                        (softwareReferentRow.referentEmail = newEmail),
                );

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Updating referent email from ${email} to ${newEmail}`,
            }));

        });

    },
    "deleteService": (params: {
        serviceId: number;
        reason: string;
        email: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, reason, serviceId } = params;

        await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { serviceRows } = newDb;

            const index = serviceRows.findIndex(
                serviceRow => serviceRow.id === serviceId,
            );

            assert(index !== -1, "The service does not exist");

            const { serviceUrl } = serviceRows[index];

            serviceRows.splice(index, 1);

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Service ${prettyPrintServiceUrl(
                    serviceUrl,
                )} deleted by ${email}. Reason: ${reason}`,
            }));

        });

    },
    "addService": (params: {
        serviceFormData: ServiceFormData;
        email: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, serviceFormData } = params;

        const { service } = await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { serviceRows } = newDb;

            const serviceId =
                newDb.serviceRows
                    .map(({ id }) => id)
                    .reduce((prev, curr) => Math.max(prev, curr), 0) +
                1;

            const {
                agencyName,
                serviceUrl,
                description,
                deployedSoftware,
                ...rest
            } = serviceFormData;

            assert<Equals<keyof typeof rest, never>>();

            serviceRows.push({
                "id": serviceId,
                agencyName,
                "publicSector": "",
                "agencyUrl": "",
                "serviceName": "",
                serviceUrl,
                description,
                "publicationDate": "",
                "lastUpdateDate": "",
                "signupScope": "",
                "usageScope": "",
                "signupValidationMethod": "",
                "contentModerationMethod": "",
                ...(deployedSoftware.isInSill
                    ? (() => {
                        const { isInSill, softwareSillId, ...rest } =
                            deployedSoftware;

                        assert<Equals<keyof typeof rest, never>>();

                        return {
                            softwareSillId,
                        };
                    })()
                    : (() => {
                        const { isInSill, softwareName, ...rest } =
                            deployedSoftware;

                        assert<Equals<keyof typeof rest, never>>();

                        return { softwareName };
                    })()),
            });

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Service ${prettyPrintServiceUrl(
                    serviceFormData.serviceUrl,
                )} added by ${email}`,
            }));

            const service = getState().webApi.compiledData.services.find(
                service => service.id === serviceId,
            );

            assert(service !== undefined);

            return { service };

        });

        return { service }

    },
    "updateService": (params: {
        serviceId: number;
        serviceFormData: ServiceFormData;
        email: string;
    }) => async (...args) => {

        const [dispatch, getState, extraArg] = args;

        const { mutex } = getContext(extraArg);

        const { email, serviceFormData, serviceId } = params;

        const { service } = await mutex.runExclusive(async () => {

            const newDb = structuredClone(getState().webApi.db);

            const { serviceRows } = newDb;

            const index = serviceRows.findIndex(
                service => service.id === serviceId,
            );

            assert(index !== -1, "The service doesn't exist");

            const {
                agencyName,
                serviceUrl,
                description,
                deployedSoftware,
                ...rest
            } = serviceFormData;

            assert<Equals<keyof typeof rest, never>>();

            serviceRows[index] = {
                ...serviceRows[index],
                "id": serviceId,
                agencyName,
                serviceUrl,
                description,
                ...(deployedSoftware.isInSill
                    ? (() => {
                        const { isInSill, softwareSillId, ...rest } =
                            deployedSoftware;

                        assert<Equals<keyof typeof rest, never>>();

                        return { softwareSillId };
                    })()
                    : (() => {
                        const { isInSill, softwareName, ...rest } =
                            deployedSoftware;

                        assert<Equals<keyof typeof rest, never>>();

                        return { softwareName };
                    })()),
            };

            await dispatch(privateThunks.updateStateRemoteAndLocal({
                newDb,
                "commitMessage": `Service ${prettyPrintServiceUrl(
                    serviceRows[index].serviceUrl,
                )} updated by ${email}`,
            }));

            const service = getState().webApi.compiledData.services.find(
                service => service.id === serviceId,
            );

            assert(service !== undefined);

            return { service };

        });

        return { service };

    },
    "getSillJsonBuffer": () => (...args) => {

        const [, , extraArgs] = args;

        const { sillJsonBuffer } = getContext(extraArgs);

        return sillJsonBuffer;

    }
} satisfies Thunks;


export const selectors = (() => {

    const sliceState = (state: State) => state.webApi;

    const referentsBySoftwareId = createSelector(sliceState, (state): Record<number, CompiledData.Software.WithReferent["referents"]> => {

        const { compiledData } = state;

        return Object.fromEntries(
            compiledData.catalog.map(({ id, referents }) => [
                id,
                referents,
            ]),
        );

    });

    const compiledDataWithoutReferents = createSelector(sliceState,
        (state): CompiledData<"without referents"> => {

            const { compiledData } = state;

            return {
                ...compiledData,
                "catalog": compiledData.catalog.map(removeReferent),
            };

        }
    );

    const tags = createSelector(sliceState, (state): string[] => {

        const { compiledData } = state;

        return compiledData.catalog
            .map(({ tags }) => tags ?? [])
            .flat()
            .reduce((prev, tag) => {
                const wrap = prev.find(wrap => wrap.tag === tag);
                if (wrap === undefined) {
                    prev.push({ tag, "count": 1 });
                } else {
                    wrap.count++;
                }
                return prev;
            }, id<{ tag: string; count: number }[]>([]))
            .sort((a, b) => b.count - a.count)
            .map(({ tag }) => tag);

    });

    return {
        referentsBySoftwareId,
        compiledDataWithoutReferents,
        tags
    };
})();

function prettyPrintServiceUrl(serviceUrl: string): string {
    return serviceUrl
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];
}
