import { exec } from "./exec";
import { join as pathJoin } from "path";
import * as fs from "fs";
import * as runExclusive from "run-exclusive";

export const gitSsh = runExclusive.build(
    async (params: {
        workingDirectoryPath?: string;
        sshUrl: string; // e.g.: git@github.com:garronej/evt.git
        sshPrivateKeyName: string;
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
            sshPrivateKeyName,
            sshPrivateKey,
            shaish,
            commitAuthorEmail = "actions@github.com",
            action,
        } = params;

        await configureOpenSshClient({ sshPrivateKeyName, sshPrivateKey });

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

            if (
                (await exec("git status --porcelain", { "cwd": repoPath })) ===
                ""
            ) {
                console.log("No change");
                break commit;
            }

            await exec(`git config --local user.email "${commitAuthorEmail}"`, {
                "cwd": repoPath,
            });
            await exec(
                `git config --local user.name "${
                    commitAuthorEmail.split("@")[0]
                }"`,
                { "cwd": repoPath },
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

async function configureOpenSshClient(params: {
    sshPrivateKeyName: string;
    sshPrivateKey: string;
}) {
    const { sshPrivateKey, sshPrivateKeyName } = params;

    const sshConfigDirPath = (
        await exec(`cd ~ && mkdir -p .ssh && cd .ssh && pwd`)
    ).replace(/\r?\n$/, "");

    await fs.promises.writeFile(
        pathJoin(sshConfigDirPath, sshPrivateKeyName),
        Buffer.from(sshPrivateKey.replace(/\\n/g, "\n"), "utf8"),
        { "mode": 0o600 },
    );

    const sshConfigFilePath = pathJoin(sshConfigDirPath, "config");

    const doesSshConfigFileExists = !!(await fs.promises
        .stat(sshConfigFilePath)
        .catch(() => null));

    if (doesSshConfigFileExists) {
        return;
    }

    await fs.promises.writeFile(
        sshConfigFilePath,
        Buffer.from("StrictHostKeyChecking=no\n", "utf8"),
    );
}
