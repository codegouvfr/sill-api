export type ServiceProvider = {
    name: string;
    website?: string;
    cdlUrl?: string;
    cnllUrl?: string;
    siren?: string;
};

export type ServiceProvidersBySillId = Partial<Record<string, ServiceProvider[]>>;

export type GetServiceProviders = () => Promise<ServiceProvidersBySillId>;
