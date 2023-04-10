import { parseGitHubRepoUrl } from "./parseGithubRepoUrl";
import { Octokit } from "@octokit/rest";
import memoize from "memoizee";
import { getLatestSemVersionedTagFactory } from "./octokit-addons/getLatestSemVersionedTag";

export async function getLatestSemVersionedTagFromSourceUrl(params: {
    sourceUrl: string;
    githubPersonalAccessTokenForApiRateLimit: string | undefined;
}): Promise<{ tag: string; publicationTime: number } | undefined> {
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

    const res = await getLatestSemVersionedTag({
        "owner": parsedGitHubRepoUrl.owner,
        "repo": parsedGitHubRepoUrl.repoName,
        "doIgnoreBeta": true
    }).catch(error => (console.warn(error.message), undefined));

    if (res === undefined) {
        console.log("failed to get latest version");
        return undefined;
    }

    const { tag } = res;

    const {
        data: {
            commit: { author }
        }
    } = await octokit.repos.getCommit({
        "owner": parsedGitHubRepoUrl.owner,
        "repo": parsedGitHubRepoUrl.repoName,
        "ref": tag
    });

    if (author === null || author.date === undefined) {
        return undefined;
    }

    return {
        tag,
        "publicationTime": new Date(author.date).getTime()
    };
}

const getOctokit = memoize(
    (githubPersonalAccessTokenForApiRateLimit: string | undefined) =>
        new Octokit(
            githubPersonalAccessTokenForApiRateLimit === undefined
                ? undefined
                : { "auth": githubPersonalAccessTokenForApiRateLimit }
        )
);
