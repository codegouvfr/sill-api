import fetch from "node-fetch";
import type { GetComptoirDuLibre, ComptoirDuLibre } from "../ports/GetComptoirDuLibre";

const url = "https://comptoir-du-libre.org/public/export/comptoir-du-libre_export_v1.json";

export const getComptoirDuLibre: GetComptoirDuLibre = () =>
    fetch(url)
        .then(res => res.text())
        .then(text => JSON.parse(text) as ComptoirDuLibre);
