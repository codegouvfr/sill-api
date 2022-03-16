import fetch from "node-fetch";
import type { Entity, DataValue } from "../tools/WikidataEntity";
import type { WikidataData } from "./types";
import cheerio from "cheerio";
import { assert } from "tsafe/assert";

// https://git.sr.ht/~etalab/sill-consolidate-data/tree/master/item/src/core.clj#L225-252
export async function fetchWikiDataData(params: {
    wikidataId: string;
}): Promise<WikidataData> {
    const { wikidataId } = params;

    const { entity } = await (async function callee(): Promise<{
        entity: Entity;
    }> {
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

            return callee();
        }
    })();

    function getClaimDataValue<Type extends "string" | "wikibase-entityid">(
        property: `P${number}`,
    ) {
        const statementClaim = entity.claims[property];

        if (statementClaim === undefined) {
            return undefined;
        }

        return (statementClaim[0].mainsnak.datavalue as DataValue<Type>).value;
    }

    return {
        ...(() => {
            const { descriptions } = entity;

            if (descriptions === undefined) {
                return {};
            }

            return {
                "descriptionFr": descriptions["fr"]?.value,
                "descriptionEn": descriptions["en"]?.value,
            };
        })(),
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
    };
}

/*
fetchWikiDataData({
    "wikidataId": "Q2033"
}).then(console.log)
*/
