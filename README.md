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
    -   [How does it work](#how-does-it-work)
-   [Dev](#dev)
    -   [Checking out the code](#checking-out-the-code)
-   [Pushing new code](#pushing-new-code)
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

The information about the software's referents aren't publicly available.  
If you are entitle to access the data [here is where the compiled data are available as an API endpoint](https://github.com/etalab/sill-referents/blob/main/private_notes.md) (private repo link).

The types definition are available [here](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/src/types.ts#L45-L69)
and can be imported as [an NPM modules](https://www.npmjs.com/package/sillfr).

## How does it work

1. Every push [this job](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/.github/workflows/ci.yaml#L157-L172) of [the CI](https://github.com/etalab/sill/actions/runs/1768877957) runs.
2. It riggers [a custom action](https://github.com/etalab/sill/blob/gh-actions/src/publish_easily_consumable_entries.ts) hosted on the `gh-actions` branch.
3. The custom action [calls](https://github.com/etalab/sill/blob/2203b02f0c3d8e5b7068251089a1f763a867e723/src/publish_easily_consumable_entries.ts#L98) the function
   in charges of compiling the softwares and referents into a single file.
   It's [here](https://github.com/etalab/sill/blob/main/src/buildExposedData.ts).
4. The data pushed to a static host and made available [here](https://github.com/etalab/sill-referents/blob/main/private_notes.md) (private link).
5. The types definition are available [here](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/src/types.ts#L45-L69) and can be imported
   as [an NPM modules](https://www.npmjs.com/package/sillfr).

# Dev

> This repo contains a private submodules that should be
> checked out after cloning the repo.

## Checking out the code

```bash
git clone https://github.com/etalab/sill
cd etalab
git submodule update --init --recursive
cd sill-referents
git checkout main
```

# Pushing new code

```bash
cd sill-referents
git add -A
git commit -am "commit message"
git push
cd ..
git add -A
git commit -am "commit message"
git push
```

# Licence

Les Groupes Mutualisation Interministérielle et les contributeurs du
dépôt, 2019-2022.

Le contenu du SILL et de ce dépôt est sous [licence
EPL-2.0 ](LICENSES/LICENSE.EPL-2.0.txt) pour les codes sources et
[licence Ouverte 2.0](LICENSES/LICENSE.Etalab-2.0.md) pour les
données ([sill-softwares.json](/sill-softwares.json)).
