import { exec } from "./exec";
import * as crypto from "crypto";
import { join as pathJoin } from "path";
import * as fs from "fs";
import * as runExclusive from "run-exclusive";

export const gitSsh = runExclusive.build(
    async (params: {
        workingDirectoryPath?: string;
        sshUrl: string; // e.g.: git@github.com:garronej/evt.git
        sshPrivateKey: string;
        shaish?: string;
        commitAuthorEmail?: string;
        action: (params: {
            repoPath: string;
        }) => Promise<
            | { doCommit: false }
            | { doCommit: true; doAddAll: boolean; message: string }
        >;
    }) => {
        const {
            workingDirectoryPath = process.cwd(),
            sshUrl,
            sshPrivateKey,
            shaish,
            commitAuthorEmail = "actions@github.com",
            action,
        } = params;

        await configureOpenSshClient({ sshPrivateKey });

        const repoDirBasename = `gitSsh_${Date.now()}`;

        const repoPath = pathJoin(workingDirectoryPath, repoDirBasename);

        await exec(`rm -rf ${repoDirBasename}`, {
            "cwd": workingDirectoryPath,
        });

        await exec(
            `git clone ${
                shaish === undefined ? "--depth 1 " : ""
            }${sshUrl} ${repoDirBasename}`,
            { "cwd": workingDirectoryPath },
        );

        if (shaish !== undefined) {
            try {
                await exec(`git checkout ${shaish}`, { "cwd": repoPath });
            } catch (e) {
                throw new ErrorNoBranch((e as Error).message);
            }
        }

        const changesResult = await (async () => {
            try {
                return await action({ repoPath });
            } catch (error) {
                return error as Error;
            }
        })();

        commit: {
            if (changesResult instanceof Error || !changesResult.doCommit) {
                break commit;
            }

            if ((await exec("git diff", { "cwd": repoPath })) === "") {
                //NOTE: No changes
                break commit;
            }

            await exec(`git config --local user.email "${commitAuthorEmail}"`);
            await exec(
                `git config --local user.name "${
                    commitAuthorEmail.split("@")[0]
                }"`,
            );

            if (changesResult.doAddAll) {
                await exec(`git add -A`, { "cwd": repoPath });
            }

            await exec(`git commit -am "${changesResult.message}"`, {
                "cwd": repoPath,
            });

            await exec(`git push`, { "cwd": repoPath });
        }

        await exec(`rm -r ${repoDirBasename}`, { "cwd": workingDirectoryPath });

        if (changesResult instanceof Error) {
            throw changesResult;
        }
    },
);

export class ErrorNoBranch extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

function getShortHash(str: string) {
    return crypto
        .createHash("shake256", { "outputLength": 8 })
        .update(str)
        .digest("hex");
}

export async function configureOpenSshClient(params: {
    sshPrivateKey: string;
}) {
    const { sshPrivateKey } = params;

    const sshConfigDirPath = (await exec(`cd ~/.ssh && pwd`)).replace(
        /\r?\n$/,
        "",
    );

    const sshConfigFilePath = pathJoin(sshConfigDirPath, "config");

    const doesSshConfigFileExists = !!(await fs.promises
        .stat(sshConfigDirPath)
        .catch(() => null));

    const sshConfigFileTargetContent = "StrictHostKeyChecking=no";

    const sshConfigFileActualContent = (
        await fs.promises.readFile(sshConfigFilePath)
    ).toString("utf8");

    if (
        doesSshConfigFileExists &&
        sshConfigFileActualContent !== sshConfigFileTargetContent
    ) {
        return;
    }

    await fs.promises.writeFile(
        sshConfigDirPath,
        Buffer.from(sshConfigFileTargetContent, "utf8"),
        { "mode": 0o600 },
    );

    await fs.promises.writeFile(
        getShortHash(sshPrivateKey),
        Buffer.from(sshPrivateKey, "utf8"),
    );
}
