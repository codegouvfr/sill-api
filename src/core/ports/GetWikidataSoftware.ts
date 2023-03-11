import type { LocalizedString as LocalizedString_generic } from "i18nifty/LocalizedString";
import type { PartialNoOptional } from "../../tools/PartialNoOptional";

export const languages = ["fr", "en"] as const;

export type Language = (typeof languages)[number];

export type LocalizedString = LocalizedString_generic<Language>;

export type WikidataSoftware = {
    id: string;
    developers: {
        name: string;
        id: string;
    }[];
} & PartialNoOptional<{
    label: LocalizedString;
    description: LocalizedString;
    logoUrl: string;
    framaLibreId: string;
    websiteUrl: string;
    sourceUrl: string;
    documentationUrl: string;
    license: string;
}>;

export type GetWikidataSoftware = (params: { wikidataId: string }) => Promise<WikidataSoftware | undefined>;
