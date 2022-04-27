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
            const value = getClaimDataValue<"string">("P154");

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
        "framaLibreId": getClaimDataValue<"string">("P4107"),
        "websiteUrl": getClaimDataValue<"string">("P856"),
        "sourceUrl": getClaimDataValue<"string">("P1324"),
        "documentationUrl": getClaimDataValue<"string">("P2078"),
        "license": await (async () => {
            const licenseId =
                getClaimDataValue<"wikibase-entityid">("P275")?.id;

            if (licenseId === undefined) {
                return undefined;
            }

            const { entity } = await fetchEntity(licenseId);

            return entity.aliases.en?.[0]?.value;
        })(),
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
        return undefined;
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

    function getClaimDataValue<Type extends "string" | "wikibase-entityid">(
        property: `P${number}`,
    ) {
        const statementClaim = entity.claims[property];

        if (statementClaim === undefined) {
            return undefined;
        }

        return (statementClaim[0].mainsnak.datavalue as DataValue<Type>).value;
    }

    return { getClaimDataValue };
}

//fetchWikiDataData({ "wikidataId": "Q171477" }).then(console.log)
