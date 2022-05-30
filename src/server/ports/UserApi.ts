export type UserApi = {
    updateUserAgencyName: (params: {
        userId: string;
        agencyName: string;
    }) => Promise<void>;
    updateUserEmail: (params: {
        userId: string;
        email: string;
    }) => Promise<void>;
    getAllowedEmailRegexp: {
        (): Promise<string>;
        clear: () => void;
    };
    getAgencyNames: {
        (): Promise<string[]>;
        clear: () => void;
    };
};
