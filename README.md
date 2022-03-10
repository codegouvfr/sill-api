<p align="center">
    <i>Ongoing work toward a new version of sill.etalab.gouv.fr</i>
    <br>
    <br>
    <a href="https://github.com/etalab/sill-api/actions">
      <img src="https://github.com/etalab/sill-api/workflows/ci/badge.svg?branch=main">
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
-   [Licences](#licences)

# Purpose

Private and public data about software in the SILL catalog come from scattered sources: from the original [sill.csv](data/softwares/sill.csv) file,
from the [sill-referent.csv](https://github.com/etalab/sill-referents/blob/main/referents.csv) file in [a private repo](https://github.com/etalab/sill-referents), from Wikidata, [Le comptoir du libre](https://comptoir-du-libre.org/), etc.

Another problem is that the SILL updates are shared informally on a private mailing list, forcing the maintainer of the sill.csv file to centralize updates: this
repository prepares a process that will be handled through a web interface where contributors will be able to update their own SILL entries by themselves.

# Dev

> This repo contains a private submodules that should be
> checked out after cloning the repo.

## Checking out the code

```bash
git clone https://github.com/etalab/sill-api
cd sill-api
git submodule update --init --recursive
cd data/referents
git checkout main
```

## Model

This repo publish a [`sill2.json`](https://code.gouv.fr/data/sill2.json) files that compiles data from [softwares.csv](data/softwares/softwares.csv)
and [Le comptoir du libre](https://comptoir-du-libre.org/).

It will be used from [code.gouv.fr](https://code.gouv.fr/) to expose the SILL.

### Generating the json files under `data/`

```bash
yarn build # Compile the code
yarn build-json # Generate the data/**/*.json files
```

### Editing `referent.csv`

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

### Publishing a new version of the types definitions

To update the version of the [`src/types.ts`](/src/types.ts) published
as [an NPM modules](https://www.npmjs.com/package/sillfr) just bump the version
of the [`package.json`](/package.json) file.

## Server

This is a node program that constitute the backend of `sill-web`

To see what to put in configuration look at `src/server/configuration.ts` and `.env.local.sh` for an example.

```bash
docker run -it -p 8080:80 --env CONFIGURATION={...} etalab/sill-api:main
```

# Licences

DINUM and contributors of the repository, 2019-2022.

-   The data are licensed under the [licence Ouverte 2.0](LICENSES/LICENSE.Etalab-2.0.md).
-   The source code is licensed under the [MIT license](LICENSES/LICENSE.MIT.md).
