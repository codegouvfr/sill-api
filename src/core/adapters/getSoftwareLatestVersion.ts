import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import { getLatestSemVersionedTagFromSourceUrl } from "../../tools/getLatestSemVersionedTagFromSourceUrl";

export function createGetSoftwareLatestVersion(params: { githubPersonalAccessTokenForApiRateLimit: string }) {
    const { githubPersonalAccessTokenForApiRateLimit } = params;

    const getSoftwareLatestVersion: GetSoftwareLatestVersion = async ({ repoUrl }) =>
        getLatestSemVersionedTagFromSourceUrl({
            githubPersonalAccessTokenForApiRateLimit,
            "sourceUrl": repoUrl
        });

    return { getSoftwareLatestVersion };
}
