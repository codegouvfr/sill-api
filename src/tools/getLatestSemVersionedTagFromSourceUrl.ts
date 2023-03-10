import { parseGitHubRepoUrl } from "./parseGithubRepoUrl";
import { Octokit } from "@octokit/rest";
import memoize from "memoizee";
import { getLatestSemVersionedTagFactory } from "./octokit-addons/getLatestSemVersionedTag";

export async function getLatestSemVersionedTagFromSourceUrl(params: {
    sourceUrl: string;
    githubPersonalAccessToken: string | undefined;
}) {
    const { sourceUrl, githubPersonalAccessToken } = params;

    let parsedGitHubRepoUrl: ReturnType<typeof parseGitHubRepoUrl>;

    try {
        parsedGitHubRepoUrl = parseGitHubRepoUrl(sourceUrl);
    } catch {
        return undefined;
    }

    const octokit = getOctokit(githubPersonalAccessToken);

    const { getLatestSemVersionedTag } = getLatestSemVersionedTagFactory({
        octokit
    });

    const tag = await getLatestSemVersionedTag({
        "owner": parsedGitHubRepoUrl.owner,
        "repo": parsedGitHubRepoUrl.repoName,
        "doIgnoreBeta": true
    })
        .then(res => (res === undefined ? undefined : res.tag))
        .catch(error => (console.warn(error.message), undefined));

    return tag;
}

const getOctokit = memoize(
    (githubPersonalAccessToken: string | undefined) =>
        new Octokit(githubPersonalAccessToken === undefined ? undefined : { "auth": githubPersonalAccessToken })
);
