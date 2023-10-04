import { parseGitHubRepoUrl } from "./parseGithubRepoUrl";
import { graphql } from "@octokit/graphql";

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

    if (githubPersonalAccessTokenForApiRateLimit === undefined) {
        return undefined;
    }

    const resp = await getLatestTag({
        "name": parsedGitHubRepoUrl.repoName,
        "owner": parsedGitHubRepoUrl.owner,
        "githubToken": githubPersonalAccessTokenForApiRateLimit
    });

    if (resp === null) {
        return undefined;
    }

    return {
        "tag": resp.name,
        "publicationTime": resp.date.getTime()
    };
}

// NOTE: GPT generated
const getLatestTag = async (params: { owner: string; name: string; githubToken: string }) => {
    const { owner, name, githubToken } = params;

    const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        refs(refPrefix: "refs/tags/", first: 100, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
          nodes {
            name
            target {
              ... on Tag {
                tagger {
                  date
                }
              }
            }
          }
        }
      }
    }
  `;

    try {
        const data: any = await graphql(query, {
            headers: {
                authorization: `token ${githubToken}`
            },
            owner,
            name
        });

        const tagsWithDates = (data.repository.refs.nodes as any[])
            .filter((node: any) => node.target.tagger)
            .map((node: any) => ({
                name: node.name,
                date: new Date(node.target.tagger.date)
            }));

        if (tagsWithDates.length === 0) {
            return null;
        }

        // Assuming the tags are already sorted by date because of the GraphQL query
        return tagsWithDates[0];
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        return null;
    }
};
