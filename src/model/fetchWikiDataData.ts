import fetch from "node-fetch";
import type {
    Entity,
    DataValue,
    LocalizedString as WikiDataLocalizedString,
} from "../tools/WikidataEntity";
import type { WikidataData, LocalizedString } from "./types";
import { languages } from "./types";
import * as cheerio from "cheerio";
import { assert } from "tsafe/assert";
import memoize from "memoizee";
import { noUndefined } from "tsafe/noUndefined";
import { allEquals } from "evt/tools/reducers/allEquals";
import { exclude } from "tsafe/exclude";
import { removeDuplicatesFactory } from "evt/tools/reducers/removeDuplicates";
import { same } from "evt/tools/inDepth/same";
import type { Language } from "../model/types";
import { createResolveLocalizedString } from "i18nifty/LocalizedString";
import { id } from "tsafe/id";
const { resolveLocalizedString } = createResolveLocalizedString({
    "currentLanguage": id<Language>("en"),
    "fallbackLanguage": "en",
});

// https://git.sr.ht/~etalab/sill-consolidate-data/tree/master/item/src/core.clj#L225-252
export async function fetchWikiDataData(params: {
    wikidataId: string;
}): Promise<WikidataData> {
    const { wikidataId } = params;

    const { entity } = await fetchEntity(wikidataId);

    const { getClaimDataValue } = createGetClaimDataValue({ entity });

    return {
        "id": wikidataId,
        "label": wikidataSingleLocalizedStringToLocalizedString(entity.labels),
        "description": wikidataSingleLocalizedStringToLocalizedString(
            entity.descriptions,
        ),
        "logoUrl": await (async () => {
            const value = getClaimDataValue<"string">("P154")[0];

            if (value === undefined) {
                return undefined;
            }

            const previewUrl = encodeURI(
                `https://www.wikidata.org/wiki/${wikidataId}#/media/File:${value}`,
            );

            const raw = await (async function callee(): Promise<string> {
                const out = await fetch(previewUrl).then(res => {
                    switch (res.status) {
                        case 429:
                            return undefined;
                        case 200:
                            return res.text();
                    }

                    throw new Error(
                        `Request to ${previewUrl} failed for unknown reason`,
                    );
                });

                if (out === undefined) {
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    return callee();
                }

                return out;
            })();

            const $ = cheerio.load(raw);

            const endOfHref =
                "File:" +
                encodeURIComponent(value)
                    .replace(/%2C/g, ",") //Preserve ','
                    .replace(/%20/g, "_"); //Replace ' ' by '_'

            const url = $(`a[href$="${endOfHref}"] img`).attr("src");

            assert(
                url !== undefined,
                `Wikidata scrapper needs to be updated ${previewUrl} ${value}, endOfHref: ${endOfHref}`,
            );

            return url;
        })(),
        "framaLibreId": getClaimDataValue<"string">("P4107")[0],
        ...(() => {
            const websiteUrl = getClaimDataValue<"string">("P856")[0];
            const sourceUrl = getClaimDataValue<"string">("P1324")[0];

            return {
                sourceUrl,
                "websiteUrl": sourceUrl !== websiteUrl ? websiteUrl : undefined,
            };
        })(),
        "documentationUrl": getClaimDataValue<"string">("P2078")[0],
        "license": await (async () => {
            const licenseId =
                getClaimDataValue<"wikibase-entityid">("P275")[0]?.id;

            if (licenseId === undefined) {
                return undefined;
            }

            const { entity } = await fetchEntity(licenseId);

            return entity.aliases.en?.[0]?.value;
        })(),
        "developers": await Promise.all(
            [
                ...getClaimDataValue<"wikibase-entityid">("P50"),
                ...getClaimDataValue<"wikibase-entityid">("P170"),
                ...getClaimDataValue<"wikibase-entityid">("P172"),
                ...getClaimDataValue<"wikibase-entityid">("P178"),
            ].map(async ({ id }) => {
                const { entity } = await fetchEntity(id);

                /*
                    const { getClaimDataValue } = createGetClaimDataValue({
                        entity,
                    });

                    const isHuman =
                        getClaimDataValue<"wikibase-entityid">("P31").find(
                            ({ id }) => id === "Q5",
                        ) !== undefined;

                    if (!isHuman) {
                        return undefined;
                    }
                    */

                const name = (() => {
                    const { shortName } = (() => {
                        const { getClaimDataValue } = createGetClaimDataValue({
                            entity,
                        });

                        const shortName =
                            getClaimDataValue<"text-language">("P1813")[0]
                                ?.text;

                        return { shortName };
                    })();

                    if (shortName !== undefined) {
                        return shortName;
                    }

                    const label =
                        wikidataSingleLocalizedStringToLocalizedString(
                            entity.labels,
                        );

                    if (label === undefined) {
                        return undefined;
                    }

                    return resolveLocalizedString(label);
                })();

                if (name === undefined) {
                    return undefined;
                }

                return {
                    name,
                    "id": entity.id,
                };
            }),
        ).then(developers =>
            developers.filter(exclude(undefined)).reduce(
                ...(() => {
                    const { removeDuplicates } = removeDuplicatesFactory({
                        "areEquals": same,
                    });

                    return removeDuplicates<
                        WikidataData["developers"][number]
                    >();
                })(),
            ),
        ),
    };
}

function wikidataSingleLocalizedStringToLocalizedString(
    wikidataSingleLocalizedString: WikiDataLocalizedString.Single,
): LocalizedString | undefined {
    const localizedString = noUndefined(
        Object.fromEntries(
            languages.map(language => [
                language,
                wikidataSingleLocalizedString[language]?.value,
            ]),
        ),
    );

    if (Object.keys(localizedString).length === 0) {
        return wikidataSingleLocalizedString[
            Object.keys(wikidataSingleLocalizedString)[0]
        ]?.value;
    }

    if (Object.values(localizedString).reduce(...allEquals())) {
        return localizedString[Object.keys(localizedString)[0]];
    }

    return localizedString;
}

const fetchEntity = memoize(
    async function callee(wikidataId: string): Promise<{ entity: Entity }> {
        try {
            const entity = await fetch(
                `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
            )
                .then(res => res.text())
                .then(
                    text => JSON.parse(text)["entities"][wikidataId] as Entity,
                );

            return { entity };
        } catch {
            await new Promise(resolve => setTimeout(resolve, 3000));

            return callee(wikidataId);
        }
    },
    {
        "promise": true,
        "maxAge": 1000 * 3600 * 3,
    },
);

function createGetClaimDataValue(params: { entity: Entity }) {
    const { entity } = params;

    function getClaimDataValue<
        Type extends "string" | "wikibase-entityid" | "text-language",
    >(property: `P${number}`) {
        const statementClaim = entity.claims[property];

        if (statementClaim === undefined) {
            return [];
        }

        return statementClaim
            .sort((a, b) => {
                const getWeight = (rank: typeof a["rank"]) =>
                    rank === "preferred" ? 1 : 0;
                return getWeight(b.rank) - getWeight(a.rank);
            })
            .map(x => (x.mainsnak.datavalue as DataValue<Type>).value);
    }

    return { getClaimDataValue };
}

//fetchWikiDataData({ "wikidataId": "Q110492908" }).then(console.log)
