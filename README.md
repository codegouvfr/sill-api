<p align="center">
    <i>Ongoing work toward a new version of sill.etalab.gouv.fr</i>
    <br>
    <br>
    <a href="https://github.com/etalab/sill/actions">
      <img src="https://github.com/etalab/sill/workflows/ci/badge.svg?branch=main">
    </a>
    <a href="https://github.com/etalab/sill#licence">
      <img src="https://img.shields.io/npm/l/sillfr">
    </a>
</p>

-   [Purpose](#purpose)
-   [Published data](#published-data)
-   [Dev](#dev)
    -   [Checking out the code](#checking-out-the-code)
    -   [Generating the json files](#generating-the-json-files)
-   [Contributing](#contributing)
    -   [Editing `referent.csv`](#editing-referentcsv)
    -   [Publishing a new version of the types definitions](#publishing-a-new-version-of-the-types-definitions)
-   [Licence](#licence)

# Purpose

Private and public data about software in the SILL catalog come from scattered sources: from the original [sill.csv](data/softwares/sill.csv) file,
from the [sill-referent.csv](data/referents/referents.csv) file in [a private repo](https://github.com/etalab/sill-referents), from Wikidata, [Le comptoir du libre](https://comptoir-du-libre.org/), etc.

Another problem is that the SILL updates are shared informally on a private mailing list, forcing the maintainer of the sill.csv file to centralize updates: this
repository prepares a process that will be handled through a web interface where contributors will be able to update their own SILL entries by themselves.

# Published data

This repo publish a [`sill2.json`](https://code.gouv.fr/data/sill2.json) files that compiles data from [softwares.csv](data/softwares/softwares.csv)
and [Le comptoir du libre](https://comptoir-du-libre.org/).

It will be used from [code.gouv.fr](https://code.gouv.fr/) to expose the SILL.

# Dev

> This repo contains a private submodules that should be
> checked out after cloning the repo.

## Checking out the code

```bash
git clone https://github.com/etalab/sill
cd sill
git submodule update --init --recursive
cd data/referents
git checkout main
```

## Generating the json files

```bash
yarn build # Compile the code
yarn start # Generate the data/**/*.json files
```

# Contributing

All changes to the `data/**/*.csv` file will triggers
new publication of updated `*.json` (assuming the changes are valid).

## Editing `referent.csv`

```bash
cd data/referents
git add -A
git commit -am "<Describe the changes made on data/referents/referents.csv>"
git push
cd ../..
git add -A
git commit -am "Update sill-referent submodule"
git push
```

## Publishing a new version of the types definitions

To update the version of the [`src/types.ts`](/src/types.ts) published
as [an NPM modules](https://www.npmjs.com/package/sillfr) just bump the version
of the [`package.json`](/package.json) file.

# Licence

DINUM and contributors of the repo, 2019-2022.

-   The data are under licencied under [licence EPL-2.0](LICENSES/LICENSE.EPL-2.0.txt).
-   The source code is [MIT](LICENSES/LICENSE.MIT.md).
