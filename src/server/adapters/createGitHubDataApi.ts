import type { DataApi } from "../ports/DataApi";
import { git } from "../../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import type { compiledDataJsonRelativeFilePath } from "../../bin/build-data";
import { URL } from "url";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";
import { id } from "tsafe/id";
import {
    softwareJsonRelativeFilePath,
    referentJsonRelativeFilePath,
    softwareReferentJsonRelativeFilePath,
    serviceJsonRelativeFilePath,
} from "../../bin/build-data";
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
import type { Param0, ReturnType } from "tsafe";
import { Octokit } from "@octokit/rest";
import { parseGitHubRepoUrl } from "../../tools/parseGithubRepoUrl";
import structuredClone from "@ungap/structured-clone";
import { noUndefined } from "tsafe/noUndefined";
import { buildCatalog } from "../../model/buildCatalog";
import type { StatefulEvt } from "evt";
import * as runExclusive from "run-exclusive";

export const buildBranch = "build";

export async function createGitHubDataApi(params: {
    dataRepoUrl: string;
    githubPersonalAccessToken: string;
    evtDataUpdated: NonPostableEvt<void>;
    doPeriodicallyTriggerComputationOfCompiledData: boolean;
}): Promise<DataApi> {
    const {
        dataRepoUrl,
        githubPersonalAccessToken,
        evtDataUpdated,
        doPeriodicallyTriggerComputationOfCompiledData,
    } = params;

    const { fetchState } = createFetchState({
        dataRepoUrl,
        githubPersonalAccessToken,
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
        dataRepoUrl,
        githubPersonalAccessToken,
        evtState,
    });

    if (doPeriodicallyTriggerComputationOfCompiledData) {
        setInterval(() => {
            console.log("Trigger computation of compiled data");

            triggerComputationOfCompiledData({
                dataRepoUrl,
                githubPersonalAccessToken,
            });
        }, 24 * 600 * 1000);
    }

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
                    partialSoftwareRow,
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
                            return t(s.name) === t(partialSoftwareRow.name);
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
                        ...partialSoftwareRow,
                        "referencedSinceTime": Date.now(),
                        "isStillInObservation": false,
                        "isPresentInSupportContract": false,
                        "alikeSoftwares": [],
                        "mimGroup": "MIMO",
                        "workshopUrls": [],
                        "testUrls": [],
                        "useCaseUrls": [],
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
                        "commitMessage": `Add ${partialSoftwareRow.name} and ${referentRow.email} as referent`,
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
                async ({ softwareId, email, partialSoftwareRow }) => {
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
                        ...noUndefined(partialSoftwareRow),
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

                    softwareReferentRows.forEach(
                        softwareReferentRow =>
                            (softwareReferentRow.referentEmail = newEmail),
                    );

                    await updateStateRemoteAndLocal({
                        newDb,
                        "commitMessage": `Updating referent email from ${email} to ${newEmail}`,
                    });
                },
            ),
        },
    };
}

export async function triggerComputationOfCompiledData(params: {
    dataRepoUrl: string;
    githubPersonalAccessToken: string;
}) {
    const { dataRepoUrl, githubPersonalAccessToken } = params;

    const octokit = new Octokit({
        "auth": githubPersonalAccessToken,
    });

    await octokit.rest.repos.createDispatchEvent({
        "owner": "etalab",
        "repo": "sill-api",
        "event_type": "compile-data",
        "client_payload": {
            "repository": parseGitHubRepoUrl(dataRepoUrl).repository,
            "incremental": false,
        },
    });
}

const { fetchCompiledData, createFetchState, createUpdateStateRemoteAndLocal } =
    (() => {
        function fetchCompiledData(params: {
            dataRepoUrl: string;
            githubPersonalAccessToken: string;
        }): Promise<CompiledData<"with referents">> {
            const { dataRepoUrl, githubPersonalAccessToken } = params;

            const dOut = new Deferred<CompiledData<"with referents">>();

            const { owner, repo } = (() => {
                const { host, pathname } = new URL(dataRepoUrl);

                assert(
                    host === "github.com",
                    `${symToStr({
                        dataRepoUrl,
                    })} is expected to be a GitHub url (until we support other forges)`,
                );

                const [owner, repo] = pathname.replace(/^\//, "").split("/");

                assert(typeof owner === "string");
                assert(typeof repo === "string");

                return { owner, repo };
            })();

            git({
                owner,
                repo,
                "shaish": buildBranch,
                "github_token": githubPersonalAccessToken,
                "action": async () => {
                    dOut.resolve(
                        JSON.parse(
                            fs
                                .readFileSync(
                                    id<typeof compiledDataJsonRelativeFilePath>(
                                        "compiledData.json",
                                    ),
                                )
                                .toString("utf8"),
                        ),
                    );

                    return { "doCommit": false };
                },
            }).catch(error => dOut.reject(error));

            return dOut.pr;
        }

        function gitDb(params: {
            dataRepoUrl: string;
            githubPersonalAccessToken: string;
            action: Param0<typeof git>["action"];
        }) {
            const { dataRepoUrl, githubPersonalAccessToken, action } = params;

            const { owner, repo } = (() => {
                const { host, pathname } = new URL(dataRepoUrl);

                assert(
                    host === "github.com",
                    `${symToStr({
                        dataRepoUrl,
                    })} is expected to be a GitHub url (until we support other forges)`,
                );

                const [owner, repo] = pathname.replace(/^\//, "").split("/");

                assert(typeof owner === "string");
                assert(typeof repo === "string");

                return { owner, repo };
            })();

            return git({
                owner,
                repo,
                "github_token": githubPersonalAccessToken,
                action,
            });
        }

        function fetchDb(params: {
            dataRepoUrl: string;
            githubPersonalAccessToken: string;
        }) {
            const { dataRepoUrl, githubPersonalAccessToken } = params;

            const dOut = new Deferred<{
                softwareRows: SoftwareRow[];
                referentRows: ReferentRow[];
                softwareReferentRows: SoftwareReferentRow[];
                serviceRows: ServiceRow[];
            }>();

            gitDb({
                dataRepoUrl,
                githubPersonalAccessToken,
                "action": async () => {
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
                        ].map(
                            relativeFilePath =>
                                new Promise<Buffer>((resolve, reject) =>
                                    fs.readFile(
                                        relativeFilePath,
                                        (error, buffer) => {
                                            if (error) {
                                                reject(error);
                                                return;
                                            }

                                            resolve(buffer);
                                        },
                                    ),
                                ),
                        ),
                    ).then(buffers =>
                        buffers.map(buffer =>
                            JSON.parse(buffer.toString("utf8")),
                        ),
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
            dataRepoUrl: string;
            githubPersonalAccessToken: string;
            evtState: StatefulEvt<DataApi.State>;
        }) {
            const { dataRepoUrl, githubPersonalAccessToken, evtState } = params;

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
                            "currentCatalog":
                                evtState.state.compiledData.catalog,
                            ...newDb,
                        }).then(({ catalog }) => catalog),
                    },
                    "db": newDb,
                };

                await gitDb({
                    dataRepoUrl,
                    githubPersonalAccessToken,
                    "action": async () => {
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
                                    ([relativeFilePath, rows]) =>
                                        [
                                            relativeFilePath,
                                            JSON.stringify(rows, null, 4),
                                        ] as const,
                                )
                                .map(
                                    ([relativeFilePath, rowsStr]) =>
                                        [
                                            relativeFilePath,
                                            Buffer.from(rowsStr, "utf8"),
                                        ] as const,
                                )
                                .map(
                                    ([relativeFilePath, buffer]) =>
                                        new Promise<void>((resolve, reject) =>
                                            fs.writeFile(
                                                relativeFilePath,
                                                buffer,
                                                error => {
                                                    if (error) {
                                                        reject(error);
                                                        return;
                                                    }
                                                    resolve();
                                                },
                                            ),
                                        ),
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
            dataRepoUrl: string;
            githubPersonalAccessToken: string;
        }) {
            const { dataRepoUrl, githubPersonalAccessToken } = params;

            async function fetchState(): Promise<DataApi.State> {
                const [compiledData, db] = await Promise.all([
                    fetchCompiledData({
                        dataRepoUrl,
                        githubPersonalAccessToken,
                    }),
                    fetchDb({
                        dataRepoUrl,
                        githubPersonalAccessToken,
                    }),
                ]);

                return { compiledData, db };
            }

            return { fetchState };
        }

        return {
            fetchCompiledData,
            createFetchState,
            createUpdateStateRemoteAndLocal,
        };
    })();

export { fetchCompiledData };
