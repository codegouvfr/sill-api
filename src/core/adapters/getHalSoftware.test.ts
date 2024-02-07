import { describe, expect, it } from "vitest";
import { getHalSoftware } from "./getHalSoftware";
import { getHalSoftwareOptions } from "./getHalSoftwareOptions";

describe("HAL", () => {
    describe("getHalSoftware", () => {
        it("gets data from Hal and converts it to ExternalSoftware", async () => {
            // https://api.archives-ouvertes.fr/search/?q=docid:1510897&wt=json&fl=*&sort=docid%20asc

            const result = await getHalSoftware("1715545");

            expect(result).toEqual({
                "description": {
                    "en": "-"
                },
                "developers": [
                    {
                        "id": "gruenpeter,-morane",
                        "name": "Gruenpeter, Morane"
                    }
                ],
                "documentationUrl": "https://inria.hal.science/hal-01715545",
                "externalId": "1715545",
                "framaLibreId": "",
                "isLibreSoftware": true,
                "label": {
                    "en": "Battleship exercise",
                    "fr": "Battleship exercise"
                },
                "license": "MIT License",
                "logoUrl": "",
                "origin": "HAL",
                "sourceUrl": "https://github.com/moranegg/Battleship",
                "websiteUrl": "https://inria.hal.science/hal-01715545"
            });
        });
    });

    describe("getHalSoftwareOption", () => {
        it("gets data from Hal and converts it to ExternalSoftwareOption", async () => {
            const result = await getHalSoftwareOptions("yolo");
        });
    });
});
