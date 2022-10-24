import { DbApi } from "../ports/DbApi";
import { gitSsh } from "../../../tools/gitSsh";
import { Deferred } from "evt/tools/Deferred";
import type {
    CompiledData,
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../../model/types";
import * as fs from "fs";
import { join as pathJoin } from "path";

export const buildBranch = "build";
export const compiledDataJsonRelativeFilePath = "compiledData.json";
const softwareJsonRelativeFilePath = "software.json";
const referentJsonRelativeFilePath = "referent.json";
const softwareReferentJsonRelativeFilePath = "softwareReferent.json";
const serviceJsonRelativeFilePath = "service.json";

export type GitDbApiParams = {
    dataRepoSshUrl: string;
    sshPrivateKeyName: string;
    sshPrivateKey: string;
};

export function createGitDbApi(params: GitDbApiParams): DbApi {
    const { dataRepoSshUrl, sshPrivateKeyName, sshPrivateKey } = params;

    return {
        "fetchCompiledData": () => {
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
        },
        "fetchDb": () => {
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
        },
        "updateDb": async ({ commitMessage, newDb }) => {
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
        },
    };
}
