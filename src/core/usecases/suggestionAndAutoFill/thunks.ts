import type { Thunks } from "../../bootstrap";
import { createUsecaseContextApi } from "redux-clean-architecture";
import { assert } from "tsafe/assert";
import type { Language } from "../../ports/GetWikidataSoftware";
import { createResolveLocalizedString } from "i18nifty/LocalizedString/reactless";
import { id } from "tsafe/id";
import { privateSelectors } from "./selectors";

export const thunks = {
    "getWikidataOptionsWithPresenceInSill":
        (params: { queryString: string; language: Language }) =>
        async (...args) => {
            const { queryString, language } = params;

            const [, getState, { getWikidataSoftwareOptions }] = args;

            const queryResults = await getWikidataSoftwareOptions({ queryString, language });

            const sillWikidataIds = privateSelectors.sillWikidataIds(getState());

            return queryResults.map(({ id, description, label, isLibreSoftware }) => ({
                "wikidataId": id,
                "description": description,
                "label": label,
                "isInSill": sillWikidataIds.includes(id),
                isLibreSoftware
            }));
        },
    "getSoftwareFormAutoFillDataFromWikidataAndOtherSources":
        (params: { wikidataId: string }) =>
        async (...args): Promise<AutoFillData> => {
            const { wikidataId } = params;

            const [, , rootContext] = args;

            const { autoFillDataCache } = getContext(rootContext);

            {
                const cachedAutoFillData = autoFillDataCache[wikidataId];

                if (cachedAutoFillData !== undefined) {
                    return cachedAutoFillData;
                }
            }

            const { getSoftwareLatestVersion, comptoirDuLibreApi, getWikidataSoftware } = rootContext;

            const [wikidataSoftware, comptoirDuLibre] = await Promise.all([
                getWikidataSoftware(wikidataId),
                comptoirDuLibreApi.getComptoirDuLibre()
            ]);

            assert(wikidataSoftware !== undefined);

            const { label: wikidataSoftwareLabel } = wikidataSoftware;

            const { comptoirDuLibreSoftware } = (() => {
                if (wikidataSoftwareLabel === undefined) {
                    return { "comptoirDuLibreSoftware": undefined };
                }

                const comptoirDuLibreSoftware = comptoirDuLibre.softwares.find(software => {
                    const format = (name: string) =>
                        name
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase()
                            .replace(/ g/, "");

                    const { resolveLocalizedString } = createResolveLocalizedString<Language>({
                        "currentLanguage": "en",
                        "fallbackLanguage": "en"
                    });

                    return format(software.name).includes(
                        format(resolveLocalizedString(wikidataSoftwareLabel)).substring(0, 8)
                    );
                });

                return { comptoirDuLibreSoftware };
            })();

            const [comptoirDuLibreLogoUrl, comptoirDuLibreKeywords] =
                comptoirDuLibreSoftware === undefined
                    ? [undefined, undefined]
                    : await Promise.all([
                          comptoirDuLibreApi.getIconUrl({ "comptoirDuLibreId": comptoirDuLibreSoftware.id }),
                          comptoirDuLibreApi.getKeywords({ "comptoirDuLibreId": comptoirDuLibreSoftware.id })
                      ]);

            const { resolveLocalizedString } = createResolveLocalizedString<Language>({
                "currentLanguage": "fr",
                "fallbackLanguage": "en"
            });

            const autoFillData: AutoFillData = {
                "comptoirDuLibreId": comptoirDuLibreSoftware?.id,
                "softwareName":
                    wikidataSoftwareLabel === undefined ? undefined : resolveLocalizedString(wikidataSoftwareLabel),
                "softwareDescription":
                    wikidataSoftware.description === undefined
                        ? undefined
                        : resolveLocalizedString(wikidataSoftware.description),
                "softwareLicense": wikidataSoftware.license ?? comptoirDuLibreSoftware?.licence,
                "softwareMinimalVersion": await (async () => {
                    const repoUrl =
                        wikidataSoftware.sourceUrl ??
                        comptoirDuLibreSoftware?.external_resources.repository ??
                        undefined;

                    return repoUrl === undefined
                        ? undefined
                        : getSoftwareLatestVersion(repoUrl, "quick").then(resp => resp?.semVer);
                })(),
                "softwareLogoUrl": wikidataSoftware.logoUrl ?? comptoirDuLibreLogoUrl,
                "keywords": comptoirDuLibreKeywords ?? []
            };

            autoFillDataCache[wikidataId] = autoFillData;

            setTimeout(() => {
                delete autoFillDataCache[wikidataId];
            }, 3 * 60 * 1000 /* 3 hours */);

            return autoFillData;
        }
} satisfies Thunks;

type AutoFillData = {
    comptoirDuLibreId: number | undefined;
    softwareName: string | undefined;
    softwareDescription: string | undefined;
    softwareLicense: string | undefined;
    softwareMinimalVersion: string | undefined;
    softwareLogoUrl: string | undefined;
    keywords: string[];
};

const { getContext } = createUsecaseContextApi(() => ({
    "autoFillDataCache": id<{ [wikidataId: string]: AutoFillData }>({})
}));
