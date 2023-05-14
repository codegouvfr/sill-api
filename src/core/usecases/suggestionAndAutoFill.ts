import type { Thunks, RootState } from "../core";
import { createSelector } from "@reduxjs/toolkit";
import { exclude } from "tsafe/exclude";
import { assert } from "tsafe/assert";
import { Language } from "../ports/GetWikidataSoftware";
import { createResolveLocalizedString } from "i18nifty/LocalizedString/reactless";
import { id } from "tsafe/id";
import fetch from "node-fetch";
import cheerio from "cheerio";

export type WikidataEntry = {
    wikidataLabel: string;
    wikidataDescription: string;
    wikidataId: string;
};

export const name = "suggestionAndAutoFill";

export const reducer = null;

export const thunks = {
    "getWikidataOptionsWithPresenceInSill":
        (params: { queryString: string; language: Language }) =>
        async (...args) => {
            const { queryString, language } = params;

            const [, getState, { getWikidataSoftwareOptions }] = args;

            const queryResults = await getWikidataSoftwareOptions({ queryString, language });

            const sillWikidataIds = privateSelector.sillWikidataIds(getState());

            return queryResults.map(({ id, description, label }): WikidataEntry & { isInSill: boolean } => ({
                "wikidataId": id,
                "wikidataDescription": description,
                "wikidataLabel": label,
                "isInSill": sillWikidataIds.includes(id)
            }));
        },
    "getSoftwareFormAutoFillDataFromWikidataAndOtherSources":
        (params: { wikidataId: string }) =>
        async (...args) => {
            const { wikidataId } = params;

            const [, , { getSoftwareLatestVersion, getComptoirDuLibre, getWikidataSoftware }] = args;

            const wikidataSoftware = await getWikidataSoftware({ wikidataId });

            assert(wikidataSoftware !== undefined);

            const { label: wikidataSoftwareLabel } = wikidataSoftware;

            const comptoirDuLibreId = await (async () => {
                if (wikidataSoftwareLabel === undefined) {
                    return undefined;
                }

                const comptoirDuLibre = await getComptoirDuLibre();

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

                return comptoirDuLibreSoftware?.id;
            })();

            const softwareLogoUrlFromComptoirDuLibre =
                comptoirDuLibreId === undefined
                    ? undefined
                    : await (async () => {
                          let imgSrc: string | undefined;

                          try {
                              const body = await fetch(
                                  `https://comptoir-du-libre.org/fr/softwares/${comptoirDuLibreId}`
                              ).then(r => r.text());

                              const $ = cheerio.load(body);

                              imgSrc = $(".size-logo-overview img").attr("src");
                          } catch {
                              return undefined;
                          }

                          if (imgSrc === undefined) {
                              return undefined;
                          }

                          return `https://comptoir-du-libre.org/${imgSrc}`;
                      })();

            const { resolveLocalizedString } = createResolveLocalizedString<Language>({
                "currentLanguage": "fr",
                "fallbackLanguage": "en"
            });

            return id<{
                comptoirDuLibreId: number | undefined;
                softwareName: string | undefined;
                softwareDescription: string | undefined;
                softwareLicense: string | undefined;
                softwareMinimalVersion: string | undefined;
                softwareLogoUrl: string | undefined;
            }>({
                comptoirDuLibreId,
                "softwareName":
                    wikidataSoftwareLabel === undefined ? undefined : resolveLocalizedString(wikidataSoftwareLabel),
                "softwareDescription":
                    wikidataSoftware.description === undefined
                        ? undefined
                        : resolveLocalizedString(wikidataSoftware.description),
                "softwareLicense": wikidataSoftware.license,
                "softwareMinimalVersion":
                    wikidataSoftware.sourceUrl === undefined
                        ? undefined
                        : await getSoftwareLatestVersion({ "repoUrl": wikidataSoftware.sourceUrl }).then(
                              resp => resp?.semVer
                          ),
                "softwareLogoUrl": softwareLogoUrlFromComptoirDuLibre ?? wikidataSoftware.logoUrl
            });
        }
} satisfies Thunks;

const privateSelector = (() => {
    const compiledData = (state: RootState) => state.readWriteSillData.compiledData;

    const sillWikidataIds = createSelector(compiledData, compiledData =>
        compiledData.map(software => software.wikidataSoftware?.id).filter(exclude(undefined))
    );

    return { sillWikidataIds };
})();
