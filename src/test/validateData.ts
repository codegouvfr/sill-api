import { matchReferent, matchSoftware } from "../validators/typeValidators";
import { validateAllRelations } from "../validators/relationsValidators";
import type { Software, Referent } from "../types";
import * as fs from "fs";
import { pathToSillSoftwaresJson, pathToSillReferentsJson } from "../bin/generateJsonFromCsv";
import { assert } from "tsafe/assert";

const [softwares, referents] = [pathToSillSoftwaresJson, pathToSillReferentsJson].map(path =>
    JSON.parse(fs.readFileSync(path).toString("utf8")),
) as [Software[], Referent[]];

softwares.forEach(software =>
    assert(matchSoftware(software), `Problem with software id: ${software._id}`),
);
referents.forEach(referent => assert(matchReferent(referent)));

validateAllRelations({
    softwares,
    referents,
});

console.log("PASS");
