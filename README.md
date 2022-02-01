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
-   [How the data are made available](#how-the-data-are-made-available)
    -   [Where are the data available as an API endpoint](#where-are-the-data-available-as-an-api-endpoint)
-   [Dev](#dev)
    -   [Checking out the code](#checking-out-the-code)
-   [Contributing](#contributing)
-   [Licence](#licence)

# Purpose

Private and public data about software in the SILL catalog come from scattered sources: from the original SILL csv file, from the sill-referent.csv file in a private repo, from Wikidata, etc. This repository solves this by aggregating the sources, exposing them as a unique and private .json file.

Another problem is that the SILL updates are shared informally on a private mailing list, forcing the maintainer of the sill.csv file to centralize updates: this repository prepares a process that will be handled through a web interface where contributors will be able to update their own SILL entries by themselves.

# How the data are made available

This repo publish a `sill.json` files that compiles the data from
`/sill-softwares.json` and `/sill-referents/sill-referents.json`.  
This file is meant to provide the information needed to implement
an interface like [this one](https://sill.etalab.gouv.fr).

## Where are the data available as an API endpoint

[See notes on private repo](https://github.com/etalab/sill-referents/blob/main/private_notes.md) to get the URL.

The types definition are available [here](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/src/types.ts#L45-L69)
and can be imported as [an NPM modules](https://www.npmjs.com/package/sillfr).

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

# Contributing

```bash
cd data/referents
git add -A
git commit -am "commit message"
git push
cd ../..
git add -A
git commit -am "commit message"
git push
```

# Licence

DINUM and contributors of the repo, 2019-2022.

-   The data are under licencied under [licence EPL-2.0](LICENSES/LICENSE.EPL-2.0.txt).
-   The source code is [MIT](LICENSES/LICENSE.MIT.md).
