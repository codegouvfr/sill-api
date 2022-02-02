//File used to programatically editing the CSV
import { join as pathJoin /*dirname as pathDirname*/ } from "path";
import { parse as csvParseSync } from "csv-parse/sync";
import { stringify as csvStringifySync_base } from "csv-stringify/sync";
import * as fs from "fs";

function csvStringifySync(input: any[]) {
    return [Object.keys(input[0]).join(","), csvStringifySync_base(input)].join("\n");
}

const projectDirPath = pathJoin(__dirname, "..", "..");

const [csvSoftwaresPath, csvReferentsPath] = [
    ["softwares", "softwares.csv"],
    ["referents", "referents.csv"],
].map(path => pathJoin(...[projectDirPath, "data", ...path]));

let [csvSoftwares, csvReferents] = [csvSoftwaresPath, csvReferentsPath].map(
    path =>
        csvParseSync(fs.readFileSync(path).toString("utf8"), {
            "columns": true,
            "skip_empty_lines": true,
        }) as any[],
);

csvSoftwares = csvSoftwares.map(row => {
    delete row["secteur"];
    delete row["composant"];
    return row;
});

csvReferents = csvReferents.map(row => {
    if (row["Courriel"] === row["Courriel 2"]) {
        row["Courriel 2"] = "";
    }
    return row;
});

csvReferents = csvReferents.filter(row => {
    const couriel: string = row["Courriel"];

    if (couriel === "") {
        return false;
    }

    if (!/^[^@ ]+@[^@ ]+$/.test(couriel)) {
        return false;
    }

    return true;
});

fs.writeFileSync(
    //pathJoin(pathDirname(csvSoftwaresPath), "softwares-fixed.csv"),
    csvSoftwaresPath,
    Buffer.from(csvStringifySync(csvSoftwares), "utf8"),
);

fs.writeFileSync(
    //pathJoin(pathDirname(csvReferentsPath), "referents-fixed.csv"),
    csvReferentsPath,
    Buffer.from(
        [
            ["Logiciel", "Courriel", "Courriel 2", "Type", "Référent : expert technique ?"].join(","),
            csvStringifySync_base(csvReferents),
        ].join("\n"),
        "utf8",
    ),
);
