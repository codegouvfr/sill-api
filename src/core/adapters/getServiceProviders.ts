import memoize from "memoizee";
import fetch from "node-fetch";
import { id } from "tsafe/id";
import type { GetServiceProviders, ServiceProvidersBySillId } from "../ports/GetServiceProviders";

type SillIdAndPrestataireFromApi = {
    sill_id: number;
    prestataires: Array<{
        nom: string;
        website?: string;
        cdl_url?: string;
        cnll_url?: string;
        siren?: string;
    }>;
};

export const getServiceProviders: GetServiceProviders = memoize(
    () =>
        fetch("https://code.gouv.fr/data/sill-prestataires.json")
            .then(response => response.json())
            .then((serviceProvidersFromApi: SillIdAndPrestataireFromApi[]) =>
                serviceProvidersFromApi.reduce(
                    (acc, { sill_id, prestataires }) => ({
                        ...acc,
                        [sill_id]: prestataires.map(prestataire => ({
                            name: prestataire.nom,
                            website: prestataire.website,
                            cdlUrl: prestataire.cdl_url,
                            cnllUrl: prestataire.cnll_url,
                            siren: prestataire.siren
                        }))
                    }),
                    id<ServiceProvidersBySillId>({})
                )
            ),
    { "promise": true, "maxAge": 3 * 3600 * 1000 }
);
