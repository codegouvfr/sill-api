#!/usr/bin/env node
import { generateEasilyConsumableEntries } from "../buildExposedData";
import * as fs from "fs";
//$ npx sillfr generate-easily-consumable-entries softwares.json referents.json

const [softwaresJsonPath, referentsJsonPath] = process.argv.slice(2, process.argv.length);

const [softwares, referents] = [softwaresJsonPath, referentsJsonPath].map(path =>
    JSON.parse(fs.readFileSync(path).toString("utf8")),
);

const easilyConsumableEntries = generateEasilyConsumableEntries({
    softwares,
    referents,
});

console.log(JSON.stringify(easilyConsumableEntries, null, 2));
