import { assert } from "tsafe/assert";

export function parseGitHubRepoUrl(url: string): {
    owner: string;
    repoName: string;
    repository: string;
} {
    const match = url.match(/^https:\/\/github.com\/([^/]+)\/([^/]+)$/);

    assert(match !== null, `Invalid GitHub repo URL: ${url}`);

    const [, owner, repoName] = match;
    return { owner, repoName, "repository": `${owner}/${repoName}` };
}
