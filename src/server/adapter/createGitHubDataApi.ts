import type { DataApi } from "../ports/DataApi";
import { git } from "../../tools/git";
import { Deferred } from "evt/tools/Deferred";
import * as fs from "fs";
import type { compiledDataJsonRelativeFilePath } from "../../bin/build-data";
import type { CompiledData } from "../../model/types";
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
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../model/types";
import { Evt } from "evt";
import type { NonPostableEvt } from "evt";
import { removeReferent } from "../../model/buildCatalog";
import type { Param0, ReturnType } from "tsafe";
import produce from "immer";
import { Octokit } from "@octokit/rest";
import { parseGitHubRepoUrl } from "../../tools/parseGithubRepoUrl";

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

    evtDataUpdated.attach(async () => (evtState.state = await fetchState()));

    const { writeDb } = createWriteDb({
        dataRepoUrl,
        githubPersonalAccessToken,
    });

    if (doPeriodicallyTriggerComputationOfCompiledData) {
        setInterval(() => {
            console.log("Trigger computation of compiled data");

            triggerComputationOfCompiledData({
                dataRepoUrl,
                githubPersonalAccessToken,
            });
        }, 3600 * 3 * 1000);
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
            "createReferent": async ({ referentRow, softwareId, isExpert }) => {
                let commitMessage = "__will be overridden";

                const newDb = produce(evtState.state.db, db => {
                    const { referentRows, softwareRows, softwareReferentRows } =
                        db;

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
                        });
                    }
                });

                if (newDb === evtState.state.db) {
                    return;
                }

                writeDb({
                    "db": newDb,
                    commitMessage,
                });

                const dOut = new Deferred<void>();

                evtState.attach(state => {
                    const { softwareReferentRows } = state.db;

                    if (
                        softwareReferentRows.find(
                            softwareReferentRow =>
                                softwareReferentRow.referentEmail ===
                                    referentRow.email &&
                                softwareReferentRow.softwareId === softwareId,
                        ) === undefined
                    ) {
                        return;
                    }

                    dOut.resolve();
                });

                return dOut.pr;
            },
        },
    };
}

async function triggerComputationOfCompiledData(params: {
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

const { fetchCompiledData, createFetchState, createWriteDb } = (() => {
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

    function createWriteDb(params: {
        dataRepoUrl: string;
        githubPersonalAccessToken: string;
    }) {
        const { dataRepoUrl, githubPersonalAccessToken } = params;

        async function writeDb(params: {
            db: ReturnType<typeof fetchDb>;
            commitMessage: string;
        }) {
            const { db, commitMessage } = params;

            await gitDb({
                dataRepoUrl,
                githubPersonalAccessToken,
                "action": async () => {
                    await Promise.all(
                        (
                            [
                                [softwareJsonRelativeFilePath, db.softwareRows],
                                [referentJsonRelativeFilePath, db.referentRows],
                                [
                                    softwareReferentJsonRelativeFilePath,
                                    db.softwareReferentRows,
                                ],
                                [serviceJsonRelativeFilePath, db.serviceRows],
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
        return { writeDb };
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

    return { fetchCompiledData, createFetchState, createWriteDb };
})();

export { fetchCompiledData };
