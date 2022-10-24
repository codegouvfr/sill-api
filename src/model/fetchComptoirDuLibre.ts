import fetch from "node-fetch";
import type { ComptoirDuLibre } from "./types";
import memoize from "memoizee";

const url =
    "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export const fetchComptoirDuLibre = memoize(
    () =>
        fetch(url)
            .then(res => res.text())
            .then(text => JSON.parse(text) as ComptoirDuLibre),
    { "promise": true, "maxAge": 5 * 60 * 1000 },
);
