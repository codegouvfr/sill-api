import fetch from "node-fetch";
import type { ComptoirDuLibreApi, ComptoirDuLibre } from "../ports/GetComptoirDuLibre";
import cheerio from "cheerio";

const url = "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export const comptoirDuLibreApi: ComptoirDuLibreApi = {
    "getComptoirDuLibre": () =>
        fetch(url)
            .then(res => res.text())
            .then(text => JSON.parse(text) as ComptoirDuLibre),
    "getComptoirDuLibreIconUrl": async ({ comptoirDuLibreId }) => {
        let imgSrc: string | undefined;

        try {
            const body = await fetch(`https://comptoir-du-libre.org/fr/softwares/${comptoirDuLibreId}`).then(r =>
                r.text()
            );

            const $ = cheerio.load(body);

            imgSrc = $(".size-logo-overview img").attr("src");
        } catch {
            return undefined;
        }

        if (imgSrc === undefined) {
            return undefined;
        }

        return `https://comptoir-du-libre.org/${imgSrc}`;
    }
};
