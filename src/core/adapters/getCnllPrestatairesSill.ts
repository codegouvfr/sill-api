import fetch from "node-fetch";
import memoize from "memoizee";
import * as https from "https";
import { zCnllPrestatairesSill, type GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";

const url = "https://annuaire.cnll.fr/api/prestataires-sill.json";

export const fetchCnllPrestatairesSill: GetCnllPrestatairesSill = memoize(
    () =>
        fetch(url, {
            "agent": new https.Agent({ "rejectUnauthorized": false })
        })
            .then(res => res.text())
            .then(text => JSON.parse(text))
            .then(zCnllPrestatairesSill.parse),
    { "promise": true, "maxAge": 5 * 60 * 1000 }
);
