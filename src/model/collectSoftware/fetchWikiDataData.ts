import fetch from "node-fetch";
import type { Entity, DataValue } from "../../tools/WikidataEntity";
import type { WikidataData } from "../types";

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
        "logoUrl": (() => {
            const value = getClaimDataValue<"string">("P154");

            return value === undefined
                ? undefined
                : encodeURI(
                      `https://www.wikidata.org/wiki/${wikidataId}#/media/File:${value}`,
                  );
        })(),
        "framaLibreId": getClaimDataValue<"string">("P4107"),
        "websiteUrl": getClaimDataValue<"string">("P856"),
        "sourceUrl": getClaimDataValue<"string">("P1324"),
        "documentationUrl": getClaimDataValue<"string">("P2078"),
    };
}

/*
fetchWikiDataData({
    "wikidataId": "Q87849488"
}).then(console.log)
*/
