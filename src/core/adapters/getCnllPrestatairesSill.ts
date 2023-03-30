import fetch from "node-fetch";
import memoize from "memoizee";
import * as https from "https";
import { z } from "zod";
import { zCnllPrestatairesSill, type GetCnllPrestatairesSill } from "../ports/GetCnllPrestatairesSill";

const url = "https://annuaire.cnll.fr/api/prestataires-sill.json";

export const getCnllPrestatairesSill: GetCnllPrestatairesSill = memoize(
    () =>
        fetch(url, {
            "agent": new https.Agent({ "rejectUnauthorized": false })
        })
            .then(res => {
                if (res.status !== 200) {
                    console.log(`Failed to fetch ${url}`);
                    return "[]";
                }
                return res.text();
            })
            .then(text => JSON.parse(text))
            .then(z.array(zCnllPrestatairesSill).parse),
    { "promise": true, "maxAge": 5 * 60 * 1000 }
);
