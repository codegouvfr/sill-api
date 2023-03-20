import { parseGitHubRepoUrl } from "./parseGithubRepoUrl";
import { Octokit } from "@octokit/rest";
import memoize from "memoizee";
import { getLatestSemVersionedTagFactory } from "./octokit-addons/getLatestSemVersionedTag";

export async function getLatestSemVersionedTagFromSourceUrl(params: {
    sourceUrl: string;
    githubPersonalAccessTokenForApiRateLimit: string | undefined;
}) {
    const { sourceUrl, githubPersonalAccessTokenForApiRateLimit } = params;

    let parsedGitHubRepoUrl: ReturnType<typeof parseGitHubRepoUrl>;

    try {
        parsedGitHubRepoUrl = parseGitHubRepoUrl(sourceUrl);
    } catch {
        return undefined;
    }

    const octokit = getOctokit(githubPersonalAccessTokenForApiRateLimit);

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
    (githubPersonalAccessTokenForApiRateLimit: string | undefined) =>
        new Octokit(
            githubPersonalAccessTokenForApiRateLimit === undefined
                ? undefined
                : { "auth": githubPersonalAccessTokenForApiRateLimit }
        )
);
