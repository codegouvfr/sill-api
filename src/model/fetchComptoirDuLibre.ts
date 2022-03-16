import fetch from "node-fetch";
import type { ComptoirDuLibre } from "./types";

const url =
    "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export async function fetchComptoirDuLibre(): Promise<ComptoirDuLibre> {
    return fetch(url)
        .then(res => res.text())
        .then(text => JSON.parse(text) as ComptoirDuLibre);
}
