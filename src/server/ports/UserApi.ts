export type UserApi = {
    updateUserAgencyName: (params: {
        userId: string;
        agencyName: string;
    }) => Promise<void>;
    updateUserEmail: (params: {
        userId: string;
        email: string;
    }) => Promise<void>;
    getEmailRegexpStringValidator: {
        (): Promise<string>;
        clear: () => void;
    };
};
