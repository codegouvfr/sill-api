import type { DbApi, Db } from "../ports/DbApi";
import { gitSsh } from "../../../tools/gitSsh";
import { Deferred } from "evt/tools/Deferred";
import type { CompiledData } from "../../../model-dsfr/types";
import * as fs from "fs";
import { join as pathJoin } from "path";

export const buildBranch = "build";
export const compiledDataJsonRelativeFilePath = "compiledData.json";
const softwareJsonRelativeFilePath = "software.json";
const agentJsonRelativeFilePath = "agent.json";
const softwareReferentJsonRelativeFilePath = "softwareReferent.json";
const softwareUserJsonRelativeFilePath = "softwareUser.json";
const instanceJsonRelativeFilePath = "instance.json";

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
                            (await fs.promises.readFile(pathJoin(repoPath, compiledDataJsonRelativeFilePath))).toString(
                                "utf8"
                            )
                        )
                    );

                    return { "doCommit": false };
                }
            }).catch(error => dOut.reject(error));

            return dOut.pr;
        },
        "fetchDb": () => {
            const dOut = new Deferred<Db>();

            gitSsh({
                "sshUrl": dataRepoSshUrl,
                sshPrivateKeyName,
                sshPrivateKey,
                "action": async ({ repoPath }) => {
                    const [softwareRows, agentRows, referentRows, userRows, instanceRows] = await Promise.all(
                        [
                            softwareJsonRelativeFilePath,
                            agentJsonRelativeFilePath,
                            softwareReferentJsonRelativeFilePath,
                            softwareUserJsonRelativeFilePath,
                            instanceJsonRelativeFilePath
                        ]
                            .map(relativeFilePath => pathJoin(repoPath, relativeFilePath))
                            .map(filePath => fs.promises.readFile(filePath))
                    ).then(buffers => buffers.map(buffer => JSON.parse(buffer.toString("utf8"))));

                    dOut.resolve({
                        softwareRows,
                        agentRows,
                        referentRows,
                        userRows,
                        instanceRows
                    });

                    return { "doCommit": false };
                }
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
                                [softwareJsonRelativeFilePath, newDb.softwareRows],
                                [agentJsonRelativeFilePath, newDb.agentRows],
                                [softwareReferentJsonRelativeFilePath, newDb.referentRows],
                                [softwareUserJsonRelativeFilePath, newDb.userRows],
                                [instanceJsonRelativeFilePath, newDb.instanceRows]
                            ] as const
                        )
                            .map(
                                ([relativeFilePath, buffer]) => [pathJoin(repoPath, relativeFilePath), buffer] as const
                            )
                            .map(([filePath, rows]) => [filePath, JSON.stringify(rows, null, 4)] as const)
                            .map(([filePath, rowsStr]) => [filePath, Buffer.from(rowsStr, "utf8")] as const)
                            .map(([filePath, buffer]) => fs.promises.writeFile(filePath, buffer))
                    );

                    return {
                        "doCommit": true,
                        "doAddAll": false,
                        "message": commitMessage
                    };
                }
            });
        }
    };
}
