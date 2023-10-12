import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import { getLatestSemVersionedTagFromSourceUrl } from "../../tools/getLatestSemVersionedTagFromSourceUrl";

export function createGetSoftwareLatestVersion(params: { githubPersonalAccessTokenForApiRateLimit: string }) {
    const { githubPersonalAccessTokenForApiRateLimit } = params;

    const getSoftwareLatestVersion: GetSoftwareLatestVersion = async ({ repoUrl }) => {
        const resp = await getLatestSemVersionedTagFromSourceUrl({
            githubPersonalAccessTokenForApiRateLimit,
            "sourceUrl": repoUrl
        });

        if (resp === undefined) {
            return undefined;
        }

        const { version, publicationTime } = resp;

        return {
            "semVer": version,
            publicationTime
        };
    };

    return { getSoftwareLatestVersion };
}
