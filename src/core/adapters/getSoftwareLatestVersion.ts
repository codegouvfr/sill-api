import type { GetSoftwareLatestVersion } from "../ports/GetSoftwareLatestVersion";
import { getLatestSemVersionedTagFromSourceUrl } from "../../tools/getLatestSemVersionedTagFromSourceUrl";

export function createGetSoftwareLatestVersion(params: { githubPersonalAccessToken: string }) {
    const { githubPersonalAccessToken } = params;

    const getSoftwareLatestVersion: GetSoftwareLatestVersion = async ({ repoUrl }) =>
        getLatestSemVersionedTagFromSourceUrl({
            githubPersonalAccessToken,
            "sourceUrl": repoUrl
        });

    return { getSoftwareLatestVersion };
}
