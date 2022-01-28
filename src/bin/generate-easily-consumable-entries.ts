#!/usr/bin/env node
import { generateEasilyConsumableEntries } from "../buildExposedData";
//$ npx sillfr generate-easily-consumable-entries '<software_json>' '<referents_json>'

const [softwaresJson, referentsJson] = process.argv.slice(2, process.argv.length);

const easilyConsumableEntries = generateEasilyConsumableEntries({
    "softwares": JSON.parse(softwaresJson),
    "referents": JSON.parse(referentsJson),
});

console.log(JSON.stringify(easilyConsumableEntries, null, 2));
