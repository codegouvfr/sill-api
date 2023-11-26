import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import { getLatestSemVersionedTagFromSourceUrl } from "../../tools/getLatestSemVersionedTagFromSourceUrl";
import memoize from "memoizee";

export function createGetSoftwareLatestVersion(params: { githubPersonalAccessTokenForApiRateLimit: string }) {
    const { githubPersonalAccessTokenForApiRateLimit } = params;

    const getSoftwareLatestVersion: GetSoftwareLatestVersion = memoize(
        async repoUrl => {
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
        },
        {
            "maxAge": 3 * 3600 * 1000,
            "promise": true
        }
    );

    return { getSoftwareLatestVersion };
}
