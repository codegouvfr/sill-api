import fetch from "node-fetch";
import memoize from "memoizee";
import { z } from "zod";
import { assert } from "tsafe";
import type { Equals } from "tsafe";
import * as https from "https";

const url = "https://annuaire.cnll.fr/api/prestataires-sill.json";

export const fetchCnllPrestatairesSill = memoize(
    () =>
        fetch(url, {
            "agent": new https.Agent({ "rejectUnauthorized": false })
        })
            .then(res => res.text())
            .then(text => JSON.parse(text))
            .then(zCnllPrestatairesSill.parse),
    { "promise": true, "maxAge": 5 * 60 * 1000 }
);

export type CnllPrestatairesSill = {
    nom: string;
    prestataires: CnllPrestatairesSill.Prestataire[];
    sill_id: number;
}[];

export namespace CnllPrestatairesSill {
    export type Prestataire = {
        nom: string;
        siren: string;
        url: string;
    };
}

const zCnllPrestatairesSill = z.array(
    z.object({
        "nom": z.string(),
        "prestataires": z.array(
            z.object({
                "nom": z.string(),
                "siren": z.string(),
                "url": z.string()
            })
        ),
        "sill_id": z.number()
    })
);

assert<Equals<ReturnType<(typeof zCnllPrestatairesSill)["parse"]>, CnllPrestatairesSill>>();
