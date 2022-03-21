import { exec } from "./exec";
import * as runExclusive from "run-exclusive";

const tmpDirPrefix = "git_tmp_xIdLsIt";

//NOTE: It changes the working directory so we can't have multiple instance
//running simultaneously.
export const git = runExclusive.build(
    async (params: {
        owner: string;
        repo: string;
        shaish?: string;
        commitAuthorEmail?: string;
        github_token: string;
        action: () => Promise<
            | { doCommit: false }
            | { doCommit: true; doAddAll: boolean; message: string }
        >;
    }) => {
        const {
            owner,
            repo,
            shaish,
            commitAuthorEmail = "actions@github.com",
            action,
            github_token,
        } = params;

        const tmpDir = `${tmpDirPrefix}_${repo}`;

        await exec(`rm -rf ${tmpDir}`);

        await exec(
            `git clone ${
                shaish === undefined ? "--depth 1 " : " "
            }https://${github_token}@github.com/${owner}/${repo} ${tmpDir}`,
        );

        const cwd = process.cwd();

        process.chdir(tmpDir);

        if (shaish !== undefined) {
            await exec(`git checkout ${shaish}`);
        }

        const changesResult = await (async () => {
            try {
                return await action();
            } catch (error) {
                return error as Error;
            }
        })();

        if (!(changesResult instanceof Error) && changesResult.doCommit) {
            await exec(`git config --local user.email "${commitAuthorEmail}"`);
            await exec(
                `git config --local user.name "${
                    commitAuthorEmail.split("@")[0]
                }"`,
            );

            if (changesResult.doAddAll) {
                await exec(`git add -A`);
            }

            await exec(`git commit -am "${changesResult.message}"`);

            {
                const url = `https://${owner}:${github_token}@github.com/${owner}/${repo}.git`;

                try {
                    await exec(`git push "${url}"`);
                } catch {
                    await exec(
                        `git push --set-upstream origin ${shaish} "${url}"`,
                    );
                }
            }
        }

        process.chdir(cwd);

        await exec(`rm -r ${tmpDir}`);

        if (changesResult instanceof Error) {
            throw changesResult;
        }
    },
);
