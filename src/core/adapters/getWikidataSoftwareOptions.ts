import type { GetWikidataSoftwareOptions } from "../ports/GetWikidataSoftwareOptions";
import fetch from "node-fetch";

export const getWikidataSoftwareOptions: GetWikidataSoftwareOptions = async ({ queryString, language }) => {
    const results: {
        search: {
            id: string;
            display: { description?: { value?: string } };
            label?: string;
        }[];
    } = (await fetch(
        [
            "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json",
            `search=${encodeURIComponent(queryString)}`,
            `language=${language}`
        ].join("&"),
        {
            "headers": {
                "User-Agent": "Socle interministériel de logiciels libres - Ap"
            }
        }
    ).then(response => response.json())) as any;

    return results.search.map(entry => ({
        "id": entry.id,
        "description": entry.display.description?.value ?? "",
        "label": entry.label ?? ""
    }));
};
