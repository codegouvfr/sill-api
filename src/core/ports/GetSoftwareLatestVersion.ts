export type GetSoftwareLatestVersion = {
    (repoUrl: string): Promise<{ semVer: string; publicationTime: number } | undefined>;
    clear: (repoUrl: string) => void;
};
