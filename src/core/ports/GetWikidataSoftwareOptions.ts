export type GetWikidataSoftwareOptions = (params: {
    queryString: string;
}) => Promise<{ id: string; label: string; description: string }[]>;
