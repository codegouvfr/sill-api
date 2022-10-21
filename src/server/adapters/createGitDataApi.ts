import type { DataApi } from "../ports/DataApi";
import { gitSsh } from "../../tools/gitSsh";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import { assert } from "tsafe/assert";
import { id } from "tsafe/id";
import type {
    CompiledData,
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../model/types";
import { removeReferent } from "../../model/types";
import { Evt } from "evt";
import type { NonPostableEvt } from "evt";
import type { ReturnType } from "tsafe";
import structuredClone from "@ungap/structured-clone";
import { buildCatalog } from "../../model/buildCatalog";
import { buildServices } from "../../model/buildServices";
import type { StatefulEvt } from "evt";
import * as runExclusive from "run-exclusive";
import { join as pathJoin } from "path";
import type { Equals } from "tsafe";

export const buildBranch = "build";

export async function createGitDataApi(params: {
    dataRepoSshUrl: string;
    sshPrivateKeyName: string;
    sshPrivateKey: string;
    evtDataUpdated: NonPostableEvt<void>;
}): Promise<DataApi> {
    const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey, evtDataUpdated } =
        params;

    const { fetchState } = createFetchState({
        sshPrivateKeyName,
        dataRepoSshUrl,
        sshPrivateKey,
    });

    const evtState = Evt.create(await fetchState());

    const groupRef = runExclusive.createGroupRef();

    evtDataUpdated.attach(
        runExclusive.build(
            groupRef,
            async () => (evtState.state = await fetchState()),
        ),
    );

    const { updateStateRemoteAndLocal } = createUpdateStateRemoteAndLocal({
        sshPrivateKeyName,
        dataRepoSshUrl,
        sshPrivateKey,
        evtState,
    });

    return {
        evtState,
        "derivedStates": {
            "evtReferentsBySoftwareId": evtState.pipe(({ compiledData }) => [
                Object.fromEntries(
                    compiledData.catalog.map(({ id, referents }) => [
                        id,
                        referents,
                    ]),
                ),
            ]),
            "evtCompiledDataWithoutReferents": evtState.pipe(
                ({ compiledData }) => [
                    {
                        ...compiledData,
                        "catalog": compiledData.catalog.map(removeReferent),
                    },
                ],
            ),
            "evtTags": evtState.pipe(({ compiledData }) => [
                compiledData.catalog
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
                    .map(({ tag }) => tag),
            ]),
        },
        "mutators": {
            "createReferent": runExclusive.build(
                groupRef,
                async ({
                    referentRow,
                    softwareId,
                    isExpert,
                    useCaseDescription,
                    isPersonalUse,
                }) => {
                    const newDb = structuredClone(evtState.state.db);

                    let commitMessage = "";

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        commitMessage,
                    });
                },
            ),
            "userNoLongerReferent": runExclusive.build(
                groupRef,
                async ({ email, softwareId }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        commitMessage,
                    });
                },
            ),
            "addSoftware": runExclusive.build(
                groupRef,
                async ({
                    softwareRowEditableByForm,
                    referentRow,
                    isExpert,
                    useCaseDescription,
                    isPersonalUse,
                }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Add ${softwareRowEditableByForm.name} and ${referentRow.email} as referent`,
                    });

                    const software = evtState.state.compiledData.catalog.find(
                        software => software.id === softwareId,
                    );

                    assert(software !== undefined);

                    return { software };
                },
            ),
            "updateSoftware": runExclusive.build(
                groupRef,
                async ({ softwareId, email, softwareRowEditableByForm }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Update ${softwareRows[index].name}`,
                    });

                    const software = evtState.state.compiledData.catalog.find(
                        software => software.id === softwareId,
                    );

                    assert(software !== undefined);

                    return { software };
                },
            ),
            "dereferenceSoftware": runExclusive.build(
                groupRef,
                async ({ softwareId, email, dereferencing, isDeletion }) => {
                    const newDb = structuredClone(evtState.state.db);

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
                        const softwareName = softwareRows[index].name;

                        softwareRows.splice(index, 1);

                        await updateStateRemoteAndLocal({
                            newDb,
                            "commitMessage": `${email} delete ${softwareName}: ${
                                dereferencing.reason ?? ""
                            }`,
                        });

                        return;
                    }

                    softwareRows[index].dereferencing =
                        structuredClone(dereferencing);

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `${email} dereference ${softwareRows[index].name}`,
                    });
                },
            ),
            "changeUserAgencyName": runExclusive.build(
                groupRef,
                async ({ email, newAgencyName }) => {
                    const newDb = structuredClone(evtState.state.db);

                    const { referentRows } = newDb;

                    const referent = referentRows.find(
                        row => row.email === email,
                    );

                    if (referent === undefined) {
                        return;
                    }

                    const { agencyName } = referent;

                    referent.agencyName = newAgencyName;

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Update ${email} agencyName from ${agencyName} to ${newAgencyName}`,
                    });
                },
            ),
            "updateUserEmail": runExclusive.build(
                groupRef,
                async ({ email, newEmail }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Updating referent email from ${email} to ${newEmail}`,
                    });
                },
            ),
            "deleteService": runExclusive.build(
                groupRef,
                async ({ serviceId, reason, email }) => {
                    const newDb = structuredClone(evtState.state.db);

                    const { serviceRows } = newDb;

                    const index = serviceRows.findIndex(
                        serviceRow => serviceRow.id === serviceId,
                    );

                    assert(index !== -1, "The service does not exist");

                    const { serviceUrl } = serviceRows[index];

                    serviceRows.splice(index, 1);

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Service ${prettyPrintServiceUrl(
                            serviceUrl,
                        )} deleted by ${email}. Reason: ${reason}`,
                    });
                },
            ),

            "addService": runExclusive.build(
                groupRef,
                async ({ serviceFormData, email }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Service ${prettyPrintServiceUrl(
                            serviceFormData.serviceUrl,
                        )} added by ${email}`,
                    });

                    const service = evtState.state.compiledData.services.find(
                        service => service.id === serviceId,
                    );

                    assert(service !== undefined);

                    return { service };
                },
            ),
            "updateService": runExclusive.build(
                groupRef,
                async ({ serviceId, serviceFormData, email }) => {
                    const newDb = structuredClone(evtState.state.db);

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

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Service ${prettyPrintServiceUrl(
                            serviceRows[index].serviceUrl,
                        )} updated by ${email}`,
                    });

                    const service = evtState.state.compiledData.services.find(
                        service => service.id === serviceId,
                    );

                    assert(service !== undefined);

                    return { service };
                },
            ),
        },
    };
}

export const compiledDataJsonRelativeFilePath = "compiledData.json";

const {
    fetchCompiledData,
    fetchDb,
    createFetchState,
    createUpdateStateRemoteAndLocal,
} = (() => {
    const softwareJsonRelativeFilePath = "software.json";
    const referentJsonRelativeFilePath = "referent.json";
    const softwareReferentJsonRelativeFilePath = "softwareReferent.json";
    const serviceJsonRelativeFilePath = "service.json";

    function fetchCompiledData(params: {
        dataRepoSshUrl: string;
        sshPrivateKeyName: string;
        sshPrivateKey: string;
    }): Promise<CompiledData<"with referents">> {
        const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey } = params;

        const dOut = new Deferred<CompiledData<"with referents">>();

        gitSsh({
            "sshUrl": dataRepoSshUrl,
            "shaish": buildBranch,
            sshPrivateKeyName,
            sshPrivateKey,
            "action": async ({ repoPath }) => {
                dOut.resolve(
                    JSON.parse(
                        (
                            await fs.promises.readFile(
                                pathJoin(
                                    repoPath,
                                    compiledDataJsonRelativeFilePath,
                                ),
                            )
                        ).toString("utf8"),
                    ),
                );

                return { "doCommit": false };
            },
        }).catch(error => dOut.reject(error));

        return dOut.pr;
    }

    function fetchDb(params: {
        dataRepoSshUrl: string;
        sshPrivateKeyName: string;
        sshPrivateKey: string;
    }) {
        const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey } = params;

        const dOut = new Deferred<{
            softwareRows: SoftwareRow[];
            referentRows: ReferentRow[];
            softwareReferentRows: SoftwareReferentRow[];
            serviceRows: ServiceRow[];
        }>();

        gitSsh({
            "sshUrl": dataRepoSshUrl,
            sshPrivateKeyName,
            sshPrivateKey,
            "action": async ({ repoPath }) => {
                const [
                    softwareRows,
                    referentRows,
                    softwareReferentRows,
                    serviceRows,
                ] = await Promise.all(
                    [
                        softwareJsonRelativeFilePath,
                        referentJsonRelativeFilePath,
                        softwareReferentJsonRelativeFilePath,
                        serviceJsonRelativeFilePath,
                    ]
                        .map(relativeFilePath =>
                            pathJoin(repoPath, relativeFilePath),
                        )
                        .map(filePath => fs.promises.readFile(filePath)),
                ).then(buffers =>
                    buffers.map(buffer => JSON.parse(buffer.toString("utf8"))),
                );

                dOut.resolve({
                    softwareRows,
                    referentRows,
                    softwareReferentRows,
                    serviceRows,
                });

                return { "doCommit": false };
            },
        });

        return dOut.pr;
    }

    function createUpdateStateRemoteAndLocal(params: {
        dataRepoSshUrl: string;
        sshPrivateKeyName: string;
        sshPrivateKey: string;
        evtState: StatefulEvt<DataApi.State>;
    }) {
        const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey, evtState } =
            params;

        async function updateStateRemoteAndLocal(params: {
            newDb: ReturnType<typeof fetchDb>;
            commitMessage: string;
        }) {
            const { newDb, commitMessage } = params;

            evtState.state = {
                ...evtState.state,
                "compiledData": {
                    ...evtState.state.compiledData,
                    //NOTE: It's important to call buildCatalog first as it may crash
                    //and if it does it mean that if we have committed we'll end up with
                    //inconsistent state.
                    "catalog": await buildCatalog({
                        "currentCatalog": evtState.state.compiledData.catalog,
                        ...newDb,
                    }).then(({ catalog }) => catalog),
                    "services": await buildServices({
                        "serviceRows": newDb.serviceRows,
                    }).then(({ services }) => services),
                },
                "db": newDb,
            };

            await gitSsh({
                "sshUrl": dataRepoSshUrl,
                sshPrivateKeyName,
                sshPrivateKey,
                "action": async ({ repoPath }) => {
                    await Promise.all(
                        (
                            [
                                [
                                    softwareJsonRelativeFilePath,
                                    newDb.softwareRows,
                                ],
                                [
                                    referentJsonRelativeFilePath,
                                    newDb.referentRows,
                                ],
                                [
                                    softwareReferentJsonRelativeFilePath,
                                    newDb.softwareReferentRows,
                                ],
                                [
                                    serviceJsonRelativeFilePath,
                                    newDb.serviceRows,
                                ],
                            ] as const
                        )
                            .map(
                                ([relativeFilePath, buffer]) =>
                                    [
                                        pathJoin(repoPath, relativeFilePath),
                                        buffer,
                                    ] as const,
                            )
                            .map(
                                ([filePath, rows]) =>
                                    [
                                        filePath,
                                        JSON.stringify(rows, null, 4),
                                    ] as const,
                            )
                            .map(
                                ([filePath, rowsStr]) =>
                                    [
                                        filePath,
                                        Buffer.from(rowsStr, "utf8"),
                                    ] as const,
                            )
                            .map(([filePath, buffer]) =>
                                fs.promises.writeFile(filePath, buffer),
                            ),
                    );

                    return {
                        "doCommit": true,
                        "doAddAll": false,
                        "message": commitMessage,
                    };
                },
            });
        }

        return { updateStateRemoteAndLocal };
    }

    function createFetchState(params: {
        dataRepoSshUrl: string;
        sshPrivateKeyName: string;
        sshPrivateKey: string;
    }) {
        const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey } = params;

        async function fetchState(): Promise<DataApi.State> {
            const [compiledData, db] = await Promise.all([
                fetchCompiledData({
                    sshPrivateKeyName,
                    dataRepoSshUrl,
                    sshPrivateKey,
                }),
                fetchDb({
                    sshPrivateKeyName,
                    dataRepoSshUrl,
                    sshPrivateKey,
                }),
            ]);

            return { compiledData, db };
        }

        return { fetchState };
    }

    return {
        fetchCompiledData,
        fetchDb,
        createFetchState,
        createUpdateStateRemoteAndLocal,
    };
})();

function prettyPrintServiceUrl(serviceUrl: string): string {
    return serviceUrl
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];
}

export { fetchCompiledData, fetchDb };
