import { exec } from "./exec";
import { join as pathJoin } from "path";
import * as fs from "fs";
import crypto from "crypto";
import { Mutex } from "async-mutex";

const mutexes: Record<string, Mutex> = {};

export const gitSsh = async (params: {
    sshUrl: string;
    sshPrivateKeyName: string;
    sshPrivateKey: string;
    shaish?: string;
    commitAuthorEmail?: string;
    action: (params: {
        repoPath: string;
    }) => Promise<{ doCommit: false } | { doCommit: true; doAddAll: boolean; message: string }>;
}) => {
    const {
        sshUrl,
        sshPrivateKeyName,
        sshPrivateKey,
        shaish,
        commitAuthorEmail = "actions@github.com",
        action
    } = params;

    const mutex = (mutexes[sshUrl + (shaish || "")] ??= new Mutex());

    return mutex.runExclusive(async () => {
        await configureOpenSshClient({ sshPrivateKeyName, sshPrivateKey });

        const cacheDir = pathJoin(process.cwd(), "node_modules", ".cache", "gitSSH");
        await fs.promises.mkdir(cacheDir, { recursive: true });

        const repoHash = crypto
            .createHash("sha1")
            .update(sshUrl + (shaish || ""))
            .digest("hex");
        const repoPath = pathJoin(cacheDir, repoHash);

        const repoExists = await fs.promises
            .stat(repoPath)
            .then(() => true)
            .catch(() => false);

        if (!repoExists) {
            // Perform git clone
            if (shaish === undefined) {
                await exec(`git clone --depth 1 ${sshUrl} ${repoPath}`);
            } else {
                if (isSha(shaish)) {
                    await exec(`git clone ${sshUrl} ${repoPath}`);
                    await exec(`git checkout ${shaish}`, { "cwd": repoPath });
                } else {
                    await exec(`git clone --branch ${shaish} --depth 1 ${sshUrl} ${repoPath}`);
                }
            }
        }

        const changesResult = await action({ repoPath });

        if (changesResult.doCommit) {
            await exec(`git config --local user.email "${commitAuthorEmail}"`, {
                "cwd": repoPath
            });
            await exec(`git config --local user.name "${commitAuthorEmail.split("@")[0]}"`, { "cwd": repoPath });

            if (changesResult.doAddAll) {
                await exec(`git add -A`, { "cwd": repoPath });
            }

            //NOTE: This can fail if there are no changes to commit
            try {
                await exec(`git commit -am "${changesResult.message}"`, { "cwd": repoPath });

                await exec(`git push`, { "cwd": repoPath });
            } catch {}
        }
    });
};

export class ErrorNoBranch extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

async function configureOpenSshClient(params: { sshPrivateKeyName: string; sshPrivateKey: string }) {
    const { sshPrivateKey, sshPrivateKeyName } = params;

    const sshConfigDirPath = (await exec(`cd ~ && mkdir -p .ssh && cd .ssh && pwd`)).replace(/\r?\n$/, "");

    await fs.promises.writeFile(
        pathJoin(sshConfigDirPath, sshPrivateKeyName),
        Buffer.from(sshPrivateKey.replace(/\\n/g, "\n"), "utf8"),
        { "mode": 0o600 }
    );

    const sshConfigFilePath = pathJoin(sshConfigDirPath, "config");

    const doesSshConfigFileExists = !!(await fs.promises.stat(sshConfigFilePath).catch(() => null));

    if (doesSshConfigFileExists) {
        return;
    }

    await fs.promises.writeFile(sshConfigFilePath, Buffer.from("StrictHostKeyChecking=no\n", "utf8"));
}

function isSha(shaish: string): boolean {
    return /^[0-9a-f]{7,40}$/i.test(shaish);
}
