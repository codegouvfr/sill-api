//File used to programatically editing the CSV
import { join as pathJoin, dirname as pathDirname, relative as pathRelative } from "path";
import { parse as csvParseSync } from "csv-parse/sync";
import { stringify as csvStringifySync_base } from "csv-stringify/sync";
import * as fs from "fs";
import fetch from "node-fetch";
import { URL } from "url";
import { assert } from "tsafe/assert";

function csvStringifySync(input: any[]) {
    return [Object.keys(input[0]).join(","), csvStringifySync_base(input)].join("\n");
}

const projectDirPath = pathJoin(__dirname, "..", "..");

const [csvSoftwaresPath] = [["softwares", "softwares.csv"]].map(path =>
    pathJoin(...[projectDirPath, "data", ...path]),
);

let [csvSoftwares] = [csvSoftwaresPath].map(
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

const cardsDirPath = pathJoin(pathDirname(csvSoftwaresPath), "cards");

csvSoftwares.forEach(async row => {
    let url = row["fiche"];

    if (url === "") {
        return;
    }

    const rawUrl = url.replace("tree/master/item", "blob/master");

    assert(rawUrl !== "");

    url = rawUrl;

    const name = row["nom"];

    const ext = new URL(url).pathname.split(".").reverse()[0];

    const cardFilePath = pathJoin(cardsDirPath, `${name}.${ext}`);

    const cardContent = await fetch(url).then(res => res.text());

    fs.writeFileSync(cardFilePath, Buffer.from(cardContent, "utf8"));

    row["fiche"] = `https://github.com/etalab/sill/blob/main/${pathRelative(
        projectDirPath,
        cardFilePath,
    )}`;
});

csvSoftwares = csvSoftwares.map(row => {
    const newRow: any = {};

    Object.keys(row).forEach(key => {
        if (key === "instances_test") {
            newRow["test"] = row[key];
        } else {
            newRow[key] = row[key];
        }
    });

    return newRow;
});

csvSoftwares.forEach(async row => {
    const value = row["ID"];

    if (value === "182") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/rstudio?autoLaunch=true";
    }

    if (value === "22") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/chromium?autoLaunch=true";
    }

    if (value === "88") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/mongodb?autoLaunch=true";
    }

    if (value === "117") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/postgis?autoLaunch=true";
    }

    if (value === "117") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/postgresql?autoLaunch=true";
    }

    if (value === "155") {
        row["test"] = "https://garronej.dev/launcher/helm-charts-sill/vscode?autoLaunch=true";
    }
});

csvSoftwares.forEach(row => {
    const value = row["atelier"];

    if (value === "") {
        return;
    }

    console.log(value);
});

fs.writeFileSync(
    pathJoin(pathDirname(csvSoftwaresPath), "softwares-fixed.csv"),
    //csvSoftwaresPath,
    Buffer.from(csvStringifySync(csvSoftwares), "utf8"),
);
