import { exec } from "./exec";

export async function gitCommit(params: {
    owner: string;
    repo: string;
    shaish?: string;
    commitAuthorEmail?: string;
    github_token: string;
    performChanges: () => Promise<
        | { doCommit: false }
        | { doCommit: true; doAddAll: boolean; message: string }
    >;
}) {
    const {
        owner,
        repo,
        shaish,
        commitAuthorEmail = "actions@github.com",
        performChanges,
        github_token,
    } = params;

    await exec(
        `git clone --depth 1 https://${github_token}@github.com/${owner}/${repo}`,
    );

    const cwd = process.cwd();

    process.chdir(repo);

    if (shaish !== undefined) {
        await exec(`git checkout ${shaish}`);
    }

    const changesResult = await (async () => {
        try {
            return await performChanges();
        } catch (error) {
            return error as Error;
        }
    })();

    if (!(changesResult instanceof Error) && changesResult.doCommit) {
        await exec(`git config --local user.email "${commitAuthorEmail}"`);
        await exec(
            `git config --local user.name "${commitAuthorEmail.split("@")[0]}"`,
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
                await exec(`git push --set-upstream origin ${shaish} "${url}"`);
            }
        }
    }

    process.chdir(cwd);

    await exec(`rm -r ${repo}`);

    if (changesResult instanceof Error) {
        throw changesResult;
    }
}
