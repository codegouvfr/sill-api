export type GetSoftwareLatestVersion = (params: {
    repoUrl: string;
}) => Promise<{ semVer: string; publicationTime: number } | undefined>;
